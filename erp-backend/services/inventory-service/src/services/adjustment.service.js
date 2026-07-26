'use strict';

const { ApiError, utils, cache } = require('@erp/shared');
const { prisma } = require('../config/prisma');
const AdjustmentRepository = require('../repositories/adjustment.repository');
const StockRepository = require('../repositories/stock.repository');
const MasterClient = require('../clients/master.client');
const publisher = require('../events/publisher');
const StockService = require('./stock.service');
const { postMovement } = require('./movement.service');
const valuation = require('./valuation.service');
const {
  ADJUSTMENT_STATUS,
  ADJUSTMENT_TRANSITIONS,
  MOVEMENT_TYPE,
  REF_TYPE,
  CACHE
} = require('../constants');

function shape(a) {
  return {
    id: a.id,
    code: a.code,
    warehouseId: a.warehouseId,
    type: a.type,
    status: a.status,
    reason: a.reason,
    lines: a.lines
      ? a.lines.map((l) => ({
          id: l.id,
          partId: l.partId,
          partCode: l.partCode,
          binLocation: l.binLocation,
          systemQty: String(l.systemQty),
          countedQty: String(l.countedQty),
          deltaQty: String(l.deltaQty),
          unitCost: String(l.unitCost),
          note: l.note
        }))
      : undefined,
    lineCount: a._count ? a._count.lines : undefined,
    submittedAt: a.submittedAt,
    approvedAt: a.approvedAt,
    rejectedAt: a.rejectedAt,
    rejectionReason: a.rejectionReason,
    postedAt: a.postedAt,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt
  };
}

function assertTransition(from, to) {
  const allowed = ADJUSTMENT_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw ApiError.conflict(`Illegal status change ${from} -> ${to}`);
  }
}

async function nextCode() {
  const year = new Date().getFullYear();
  const count = await AdjustmentRepository.countByType(undefined, year).catch(() => 0);
  const seq = String(count + 1).padStart(4, '0');
  return `ADJ-${year}-${seq}`;
}

class AdjustmentService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['createdAt', 'code'],
      defaultSortField: 'createdAt'
    });
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {})
    };
    const { items, total } = await AdjustmentRepository.paginate({
      where,
      skip: pagination.skip,
      take: pagination.take
    });
    return { items: items.map(shape), total, page: pagination.page, limit: pagination.limit };
  }

  static async getById(id) {
    const adjustment = await AdjustmentRepository.findById(id);
    if (!adjustment) throw ApiError.notFound('Adjustment not found');
    return shape(adjustment);
  }

  static async create(payload, user) {
    const warehouseId = await StockService.resolveWarehouse(payload.warehouseId);

    const partIds = payload.lines.map((l) => l.partId);
    const { missing } = await MasterClient.verifyParts(partIds, user);
    if (missing.length) throw ApiError.badRequest('Some parts do not exist in master data', { missing });

    const lines = await AdjustmentService.buildLines(warehouseId, payload.lines);

    const adjustment = await AdjustmentRepository.create({
      code: await nextCode(),
      warehouseId,
      type: payload.type || 'CYCLE_COUNT',
      status: ADJUSTMENT_STATUS.DRAFT,
      reason: payload.reason || null,
      createdBy: user.id,
      lines: { create: lines }
    });

    return shape(adjustment);
  }

  static async update(id, payload, user) {
    const adjustment = await AdjustmentRepository.findById(id);
    if (!adjustment) throw ApiError.notFound('Adjustment not found');
    if (adjustment.status !== ADJUSTMENT_STATUS.DRAFT) {
      throw ApiError.conflict('Only draft adjustments can be edited');
    }

    if (payload.lines) {
      const lines = await AdjustmentService.buildLines(adjustment.warehouseId, payload.lines);
      await AdjustmentRepository.replaceLines(id, lines);
    }

    const updated = await AdjustmentRepository.update(id, {
      reason: payload.reason ?? adjustment.reason,
      type: payload.type ?? adjustment.type,
      updatedBy: user.id
    });
    return shape(updated);
  }

  /** Resolves current system quantity per line so the delta is snapshot-safe. */
  static async buildLines(warehouseId, lines) {
    const out = [];
    for (const line of lines) {
      const position = await StockRepository.findPosition(line.partId, warehouseId, line.binLocation || 'DEFAULT');
      const systemQty = position ? Number(position.onHand) : 0;
      const countedQty = valuation.qty(line.countedQty);
      out.push({
        partId: line.partId,
        partCode: position ? position.partCode : line.partCode || null,
        binLocation: line.binLocation || 'DEFAULT',
        systemQty: valuation.qty(systemQty),
        countedQty,
        deltaQty: valuation.qty(countedQty - systemQty),
        unitCost: valuation.cost(line.unitCost ?? (position ? position.avgCost : 0)),
        note: line.note || null
      });
    }
    return out;
  }

  static async submit(id, user) {
    const adjustment = await AdjustmentRepository.findById(id);
    if (!adjustment) throw ApiError.notFound('Adjustment not found');
    assertTransition(adjustment.status, ADJUSTMENT_STATUS.PENDING_APPROVAL);
    if (!adjustment.lines.length) throw ApiError.badRequest('Add at least one line before submitting');

    const updated = await AdjustmentRepository.update(id, {
      status: ADJUSTMENT_STATUS.PENDING_APPROVAL,
      submittedAt: new Date(),
      updatedBy: user.id
    });
    return shape(updated);
  }

  static async approve(id, user) {
    const adjustment = await AdjustmentRepository.findById(id);
    if (!adjustment) throw ApiError.notFound('Adjustment not found');
    assertTransition(adjustment.status, ADJUSTMENT_STATUS.APPROVED);

    const updated = await AdjustmentRepository.update(id, {
      status: ADJUSTMENT_STATUS.APPROVED,
      approvedAt: new Date(),
      approvedBy: user.id,
      updatedBy: user.id
    });
    return shape(updated);
  }

  static async reject(id, reason, user) {
    const adjustment = await AdjustmentRepository.findById(id);
    if (!adjustment) throw ApiError.notFound('Adjustment not found');
    assertTransition(adjustment.status, ADJUSTMENT_STATUS.REJECTED);

    const updated = await AdjustmentRepository.update(id, {
      status: ADJUSTMENT_STATUS.REJECTED,
      rejectedAt: new Date(),
      rejectionReason: reason,
      updatedBy: user.id
    });
    return shape(updated);
  }

  /** Posts approved deltas to the ledger. Each non-zero line becomes a movement. */
  static async post(id, user) {
    const adjustment = await AdjustmentRepository.findById(id);
    if (!adjustment) throw ApiError.notFound('Adjustment not found');
    assertTransition(adjustment.status, ADJUSTMENT_STATUS.POSTED);

    const touched = [];

    await prisma.$transaction(async (tx) => {
      for (const line of adjustment.lines) {
        const delta = Number(line.deltaQty);
        if (delta === 0) continue;

        let item = await StockRepository.findPosition(line.partId, adjustment.warehouseId, line.binLocation, tx);
        if (!item) {
          item = await StockService.ensurePosition(tx, {
            partId: line.partId,
            warehouseId: adjustment.warehouseId,
            binLocation: line.binLocation,
            part: { code: line.partCode },
            user
          });
        }

        await postMovement(tx, item, {
          type: delta > 0 ? MOVEMENT_TYPE.ADJUSTMENT_IN : MOVEMENT_TYPE.ADJUSTMENT_OUT,
          quantity: Math.abs(delta),
          unitCost: line.unitCost,
          refType: REF_TYPE.ADJUSTMENT,
          refId: adjustment.id,
          refCode: adjustment.code,
          reason: `${adjustment.type} adjustment`,
          actorId: user.id
        });

        await tx.stockItem.update({ where: { id: item.id }, data: { lastCountedAt: new Date() } });
        touched.push(item.id);
      }

      await tx.stockAdjustment.update({
        where: { id },
        data: { status: ADJUSTMENT_STATUS.POSTED, postedAt: new Date(), updatedBy: user.id }
      });
    });

    await cache.del(CACHE.lowStock(), CACHE.valuation(), ...touched.map((tid) => CACHE.stock(tid)));
    const posted = await AdjustmentRepository.findById(id);
    await publisher.adjustmentPosted(posted, user.id);
    return shape(posted);
  }

  static shape = shape;
}

module.exports = AdjustmentService;
