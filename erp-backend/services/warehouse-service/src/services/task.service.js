'use strict';

const { ApiError, utils, logger } = require('@erp/shared');
const TaskRepository = require('../repositories/task.repository');
const BinRepository = require('../repositories/bin.repository');
const WarehouseService = require('./warehouse.service');
const PutawayRuleService = require('./putawayRule.service');
const InventoryClient = require('../clients/inventory.client');
const publisher = require('../events/publisher');
const {
  TASK_TYPE,
  TASK_STATUS,
  TASK_TRANSITIONS,
  TASK_OPEN,
  REF_TYPE
} = require('../constants');

function shape(t) {
  return {
    id: t.id,
    code: t.code,
    warehouseId: t.warehouseId,
    type: t.type,
    status: t.status,
    partId: t.partId,
    partCode: t.partCode,
    quantity: String(t.quantity),
    uom: t.uom,
    from: t.fromBinId ? { binId: t.fromBinId, binCode: t.fromBinCode } : null,
    to: t.toBinId ? { binId: t.toBinId, binCode: t.toBinCode } : null,
    refType: t.refType,
    refId: t.refId,
    refCode: t.refCode,
    priority: t.priority,
    assignedTo: t.assignedTo,
    note: t.note,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
    cancelledAt: t.cancelledAt,
    cancelReason: t.cancelReason,
    createdAt: t.createdAt
  };
}

function assertTransition(from, to) {
  const allowed = TASK_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) throw ApiError.conflict(`Illegal task status change ${from} -> ${to}`);
}

async function nextCode(type) {
  const year = new Date().getFullYear();
  const count = await TaskRepository.countThisYear(year).catch(() => 0);
  const prefix = { PUTAWAY: 'PA', PICK: 'PK', MOVE: 'MV', COUNT: 'CT', REPLENISH: 'RP' }[type] || 'WT';
  return `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
}

async function resolveBin(warehouseId, binId, binCode) {
  if (binId) {
    const bin = await BinRepository.findById(binId);
    if (!bin || bin.warehouseId !== warehouseId) throw ApiError.badRequest('Bin does not belong to this warehouse');
    return bin;
  }
  if (binCode) {
    const bin = await BinRepository.findByCode(warehouseId, binCode.toUpperCase());
    if (!bin) throw ApiError.badRequest(`Bin ${binCode} not found in this warehouse`);
    return bin;
  }
  return null;
}

class TaskService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['createdAt', 'priority', 'code'],
      defaultSortField: 'createdAt'
    });
    const where = {
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.assignedTo ? { assignedTo: query.assignedTo } : {}),
      ...(query.refType ? { refType: query.refType } : {}),
      ...(query.refId ? { refId: query.refId } : {})
    };
    const { items, total } = await TaskRepository.paginate({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy
    });
    return { items: items.map(shape), total, page: pagination.page, limit: pagination.limit };
  }

  static async getById(id) {
    const task = await TaskRepository.findById(id);
    if (!task) throw ApiError.notFound('Task not found');
    return shape(task);
  }

  static async create(payload, user) {
    await WarehouseService.assertExists(payload.warehouseId);

    const fromBin = await resolveBin(payload.warehouseId, payload.fromBinId, payload.fromBinCode);
    let toBin = await resolveBin(payload.warehouseId, payload.toBinId, payload.toBinCode);

    // Auto-suggest a destination for putaway when none was provided.
    if (!toBin && payload.type === TASK_TYPE.PUTAWAY) {
      const { bin } = await PutawayRuleService.resolveBin(payload.warehouseId, {
        partId: payload.partId,
        categoryId: payload.categoryId || null,
        needUnits: Math.ceil(Number(payload.quantity)),
        mslRequired: payload.mslRequired ?? null
      });
      if (bin) toBin = await BinRepository.findById(bin.id);
    }

    const task = await TaskRepository.create({
      code: await nextCode(payload.type),
      warehouseId: payload.warehouseId,
      type: payload.type,
      status: TASK_STATUS.PENDING,
      partId: payload.partId,
      partCode: payload.partCode || null,
      quantity: payload.quantity,
      uom: payload.uom || 'PCS',
      fromBinId: fromBin ? fromBin.id : null,
      fromBinCode: fromBin ? fromBin.code : null,
      toBinId: toBin ? toBin.id : null,
      toBinCode: toBin ? toBin.code : null,
      refType: payload.refType || REF_TYPE.MANUAL,
      refId: payload.refId || null,
      refCode: payload.refCode || null,
      priority: payload.priority ?? 100,
      assignedTo: payload.assignedTo || null,
      note: payload.note || null,
      createdBy: user ? user.id : null
    });

    await publisher.taskCreated(task, user ? user.id : null);
    return shape(task);
  }

  static async assign(id, assigneeId, user) {
    const task = await TaskRepository.findById(id);
    if (!task) throw ApiError.notFound('Task not found');
    assertTransition(task.status, TASK_STATUS.ASSIGNED);
    const updated = await TaskRepository.update(id, { status: TASK_STATUS.ASSIGNED, assignedTo: assigneeId });
    await publisher.taskAssigned(updated, user.id);
    return shape(updated);
  }

  static async start(id) {
    const task = await TaskRepository.findById(id);
    if (!task) throw ApiError.notFound('Task not found');
    assertTransition(task.status, TASK_STATUS.IN_PROGRESS);
    const updated = await TaskRepository.update(id, { status: TASK_STATUS.IN_PROGRESS, startedAt: new Date() });
    return shape(updated);
  }

  /**
   * Completing a PUTAWAY / MOVE task shifts the physical stock between bins in
   * the Inventory service and updates local bin occupancy counters.
   */
  static async complete(id, payload, user) {
    const task = await TaskRepository.findById(id);
    if (!task) throw ApiError.notFound('Task not found');
    assertTransition(task.status, TASK_STATUS.COMPLETED);

    let toBin = task.toBinId ? await BinRepository.findById(task.toBinId) : null;
    if (payload && (payload.toBinId || payload.toBinCode)) {
      toBin = await resolveBin(task.warehouseId, payload.toBinId, payload.toBinCode);
    }

    const needsStockMove = [TASK_TYPE.PUTAWAY, TASK_TYPE.MOVE, TASK_TYPE.REPLENISH].includes(task.type);
    if (needsStockMove && toBin) {
      const fromBinCode = task.fromBinCode || 'DEFAULT';
      try {
        await InventoryClient.transferBin(
          {
            partId: task.partId,
            warehouseId: task.warehouseId,
            fromBin: fromBinCode,
            toBin: toBin.code,
            quantity: Number(task.quantity),
            refCode: task.code
          },
          user
        );
      } catch (err) {
        // Surface inventory failures so the operator can retry rather than
        // silently marking the task done with stock still in the wrong bin.
        throw ApiError.serviceUnavailable(`Stock move failed in Inventory: ${err.message}`);
      }
    }

    const units = Math.round(Number(task.quantity));
    if (task.fromBinId) await BinRepository.adjustOccupancy(task.fromBinId, -units);
    if (toBin) await BinRepository.adjustOccupancy(toBin.id, units);

    const updated = await TaskRepository.update(id, {
      status: TASK_STATUS.COMPLETED,
      completedAt: new Date(),
      toBinId: toBin ? toBin.id : task.toBinId,
      toBinCode: toBin ? toBin.code : task.toBinCode
    });

    await publisher.taskCompleted(updated, user.id);
    if (task.type === TASK_TYPE.PUTAWAY) await publisher.putawayCompleted(updated, user.id);
    if (task.type === TASK_TYPE.PICK) await publisher.pickCompleted(updated, user.id);
    return shape(updated);
  }

  static async cancel(id, reason, user) {
    const task = await TaskRepository.findById(id);
    if (!task) throw ApiError.notFound('Task not found');
    assertTransition(task.status, TASK_STATUS.CANCELLED);
    const updated = await TaskRepository.update(id, {
      status: TASK_STATUS.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: reason
    });
    return shape(updated);
  }

  /** Auto-create a putaway task from an inventory receipt event. */
  static async autoPutaway({ warehouseId, partId, partCode, quantity, refType, refId }, actorId) {
    if (!warehouseId || !partId) return null;
    const open = await TaskRepository.paginate({
      where: { warehouseId, partId, type: TASK_TYPE.PUTAWAY, status: { in: TASK_OPEN }, refId: refId || undefined },
      skip: 0,
      take: 1
    });
    if (open.total > 0) return null; // avoid duplicate putaway for the same receipt

    const created = await TaskService.create(
      {
        warehouseId,
        type: TASK_TYPE.PUTAWAY,
        partId,
        partCode: partCode || null,
        quantity: quantity || 0,
        refType: refType || REF_TYPE.INVENTORY_RECEIPT,
        refId: refId || null
      },
      { id: actorId }
    ).catch((err) => {
      logger.error('Auto-putaway task failed: %s', err.message);
      return null;
    });
    return created;
  }

  static async sweepStale(before) {
    const stale = await TaskRepository.staleOpen(before);
    return { stale: stale.length };
  }

  static shape = shape;
}

module.exports = TaskService;
