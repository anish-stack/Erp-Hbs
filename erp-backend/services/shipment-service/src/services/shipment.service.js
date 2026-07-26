'use strict';
const { ApiError, utils, cache } = require('@erp/shared');
const ShipmentRepository = require('../repositories/shipment.repository');
const SalesClient = require('../clients/sales.client');
const WarehouseClient = require('../clients/warehouse.client');
const InventoryClient = require('../clients/inventory.client');
const publisher = require('../events/publisher');
const { SHIPMENT_STATUS, SHIPMENT_TRANSITIONS, REF_TYPE, CACHE } = require('../constants');
const config = require('../config');

function dec(v) { return v === null || v === undefined ? null : String(v); }

function shapeLine(l) {
  return {
    id: l.id, orderLineId: l.orderLineId, partId: l.partId, partCode: l.partCode, description: l.description,
    quantity: dec(l.quantity), pickedQty: dec(l.pickedQty), reservationId: l.reservationId, pickTaskId: l.pickTaskId
  };
}

function shape(s) {
  if (!s) return null;
  return {
    id: s.id, code: s.code, status: s.status,
    orderId: s.orderId, orderCode: s.orderCode, customerId: s.customerId, customerName: s.customerName, warehouseId: s.warehouseId,
    carrier: s.carrier, trackingNumber: s.trackingNumber, shippingAddress: s.shippingAddress,
    packedWeightKg: dec(s.packedWeightKg), packageCount: s.packageCount,
    lines: s.lines ? s.lines.map(shapeLine) : undefined,
    lineCount: s._count ? s._count.lines : undefined,
    pickedAt: s.pickedAt, packedAt: s.packedAt, dispatchedAt: s.dispatchedAt, deliveredAt: s.deliveredAt,
    cancelledAt: s.cancelledAt, cancelReason: s.cancelReason, notes: s.notes,
    createdAt: s.createdAt, updatedAt: s.updatedAt
  };
}

function assertTransition(from, to) {
  const allowed = SHIPMENT_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) throw ApiError.conflict(`Illegal shipment status change ${from} -> ${to}`);
}

async function nextCode() {
  const year = new Date().getFullYear();
  const n = await ShipmentRepository.countYear(year).catch(() => 0);
  return `SHP-${year}-${String(n + 1).padStart(5, '0')}`;
}

class ShipmentService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, { allowedSortFields: ['createdAt', 'code', 'dispatchedAt'], defaultSortField: 'createdAt' });
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.orderId ? { orderId: query.orderId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.search ? { OR: [{ code: { contains: query.search } }, { orderCode: { contains: query.search } }, { trackingNumber: { contains: query.search } }] } : {})
    };
    const { items, total } = await ShipmentRepository.paginate({ where, skip: pagination.skip, take: pagination.take, orderBy: pagination.orderBy });
    return { items: items.map(shape), total, page: pagination.page, limit: pagination.limit };
  }

  static async getById(id) {
    const s = await ShipmentRepository.findById(id);
    if (!s) throw ApiError.notFound('Shipment not found');
    return shape(s);
  }

  /** Manual shipment creation from arbitrary lines (no sales order lookup). */
  static async create(payload, user) {
    const s = await ShipmentRepository.create({
      code: await nextCode(),
      status: SHIPMENT_STATUS.PENDING,
      orderId: payload.orderId,
      orderCode: payload.orderCode || null,
      customerId: payload.customerId,
      customerName: payload.customerName || null,
      warehouseId: payload.warehouseId,
      carrier: payload.carrier || config.defaultCarrier,
      shippingAddress: payload.shippingAddress || null,
      notes: payload.notes || null,
      createdBy: user.id, updatedBy: user.id,
      lines: {
        create: payload.lines.map((l) => ({
          orderLineId: l.orderLineId || null, partId: l.partId, partCode: l.partCode || null,
          description: l.description || null, quantity: l.quantity, reservationId: l.reservationId || null
        }))
      }
    });
    await publisher.created(s, user.id);
    return shape(s);
  }

  /**
   * Builds a shipment straight from a confirmed sales order: one line per
   * order line (unshipped quantity), carrying over each line's reservationId
   * so dispatch can convert the reservation into an actual stock issue.
   * Idempotent: an order already has at most one open (non-cancelled) shipment.
   */
  static async createFromOrder(orderId, user) {
    const existing = await ShipmentRepository.findByOrder(orderId);
    if (existing) return ShipmentService.getById(existing.id);

    const order = await SalesClient.getOrder(orderId, user);
    if (!order) throw ApiError.badRequest('Sales order not found', { orderId });
    if (!order.warehouseId) throw ApiError.badRequest('Sales order has no warehouse assigned', { orderId });

    const openLines = (order.lines || []).filter((l) => Number(l.openQty ?? (Number(l.quantity) - Number(l.shippedQty || 0))) > 0);
    if (!openLines.length) throw ApiError.conflict('Sales order has nothing left to ship');

    const s = await ShipmentRepository.create({
      code: await nextCode(),
      status: SHIPMENT_STATUS.PENDING,
      orderId: order.id,
      orderCode: order.code,
      customerId: order.customerId,
      customerName: order.customerName,
      warehouseId: order.warehouseId,
      carrier: config.defaultCarrier,
      notes: `Auto-created from sales order ${order.code}`,
      createdBy: user ? user.id : null,
      updatedBy: user ? user.id : null,
      lines: {
        create: openLines.map((l) => ({
          orderLineId: l.id,
          partId: l.partId,
          partCode: l.partCode,
          description: l.description,
          quantity: Number(l.openQty ?? (Number(l.quantity) - Number(l.shippedQty || 0))),
          reservationId: l.reservationId || null
        }))
      }
    });

    await publisher.created(s, user ? user.id : null);

    if (config.autoCreatePickTasks) {
      await ShipmentService.createPickTasks(s.id, user).catch((err) =>
        publisher.emit('shipment.pick_task.failed', { shipmentId: s.id, reason: err.message })
      );
    }

    return ShipmentService.getById(s.id);
  }

  /** Raises a Warehouse PICK task per line and moves the shipment to PICKING. */
  static async createPickTasks(id, user) {
    const s = await ShipmentRepository.findById(id);
    if (!s) throw ApiError.notFound('Shipment not found');
    if (s.status !== SHIPMENT_STATUS.PENDING) throw ApiError.conflict('Pick tasks can only be raised for a pending shipment');

    for (const line of s.lines) {
      if (line.pickTaskId) continue;
      try {
        const task = await WarehouseClient.createPickTask({
          warehouseId: s.warehouseId,
          type: 'PICK',
          partId: line.partId,
          partCode: line.partCode,
          quantity: Number(line.quantity),
          refType: REF_TYPE.SHIPMENT,
          refId: s.id,
          refCode: s.code
        }, user);
        await ShipmentRepository.updateLine(line.id, { pickTaskId: task.taskId || task.id });
      } catch (err) {
        // Non-fatal: pick tasks can be created later or picking done manually.
        continue;
      }
    }

    const updated = await ShipmentRepository.update(id, { status: SHIPMENT_STATUS.PICKING, updatedBy: user ? user.id : null });
    await publisher.picking(updated, user ? user.id : null);
    return shape(updated);
  }

  static async markPicked(id, payload, user) {
    const s = await ShipmentRepository.findById(id);
    if (!s) throw ApiError.notFound('Shipment not found');
    assertTransition(s.status, SHIPMENT_STATUS.PICKED);

    const pickedByLine = new Map((payload.lines || []).map((l) => [l.lineId, Number(l.pickedQty)]));
    for (const line of s.lines) {
      const qty = pickedByLine.has(line.id) ? pickedByLine.get(line.id) : Number(line.quantity);
      await ShipmentRepository.updateLine(line.id, { pickedQty: qty });
    }

    const updated = await ShipmentRepository.update(id, { status: SHIPMENT_STATUS.PICKED, pickedAt: new Date(), updatedBy: user.id });
    await publisher.picked(updated, user.id);
    return shape(updated);
  }

  static async markPacked(id, payload, user) {
    const s = await ShipmentRepository.findById(id);
    if (!s) throw ApiError.notFound('Shipment not found');
    assertTransition(s.status, SHIPMENT_STATUS.PACKED);
    const updated = await ShipmentRepository.update(id, {
      status: SHIPMENT_STATUS.PACKED, packedAt: new Date(),
      packageCount: payload.packageCount ?? s.packageCount,
      packedWeightKg: payload.packedWeightKg ?? s.packedWeightKg,
      updatedBy: user.id
    });
    await publisher.packed(updated, user.id);
    return shape(updated);
  }

  /**
   * Dispatches the shipment: converts each line's stock reservation into an
   * actual issue (or issues directly if no reservation exists), then emits
   * shipment.dispatched carrying the shipped lines for Sales/Inventory to
   * consume. A failed stock conversion aborts the dispatch.
   */
  static async dispatch(id, payload, user) {
    const s = await ShipmentRepository.findById(id);
    if (!s) throw ApiError.notFound('Shipment not found');
    assertTransition(s.status, SHIPMENT_STATUS.DISPATCHED);

    for (const line of s.lines) {
      const qty = Number(line.pickedQty) > 0 ? Number(line.pickedQty) : Number(line.quantity);
      try {
        if (line.reservationId) {
          await InventoryClient.fulfillReservation(line.reservationId, { quantity: qty, refCode: s.code }, user);
        } else {
          await InventoryClient.issue({
            partId: line.partId, warehouseId: s.warehouseId, quantity: qty,
            refType: REF_TYPE.SHIPMENT, refId: s.id, refCode: s.code, reason: `Dispatch ${s.code}`
          }, user);
        }
      } catch (err) {
        throw ApiError.serviceUnavailable(`Failed to issue stock for part ${line.partCode || line.partId}: ${err.message}`);
      }
      if (Number(line.pickedQty) === 0) await ShipmentRepository.updateLine(line.id, { pickedQty: qty });
    }

    const updated = await ShipmentRepository.update(id, {
      status: SHIPMENT_STATUS.DISPATCHED,
      dispatchedAt: new Date(),
      carrier: payload.carrier || s.carrier,
      trackingNumber: payload.trackingNumber || s.trackingNumber,
      updatedBy: user.id
    });

    await cache.del(CACHE.shipment(id));
    await publisher.dispatched(updated, user.id);
    return shape(updated);
  }

  static async markDelivered(id, user) {
    const s = await ShipmentRepository.findById(id);
    if (!s) throw ApiError.notFound('Shipment not found');
    assertTransition(s.status, SHIPMENT_STATUS.DELIVERED);
    const updated = await ShipmentRepository.update(id, { status: SHIPMENT_STATUS.DELIVERED, deliveredAt: new Date(), updatedBy: user.id });
    await publisher.delivered(updated, user.id);
    return shape(updated);
  }

  static async cancel(id, reason, user) {
    const s = await ShipmentRepository.findById(id);
    if (!s) throw ApiError.notFound('Shipment not found');
    assertTransition(s.status, SHIPMENT_STATUS.CANCELLED);
    const updated = await ShipmentRepository.update(id, { status: SHIPMENT_STATUS.CANCELLED, cancelledAt: new Date(), cancelReason: reason, updatedBy: user.id });
    await publisher.cancelled(updated, reason, user.id);
    return shape(updated);
  }

  static async sweepStale(before) {
    const stale = await ShipmentRepository.staleOpen(before);
    return { stale: stale.length };
  }

  static async stats() {
    const raw = await ShipmentRepository.stats();
    return { total: raw.total, byStatus: raw.byStatus.map((r) => ({ status: r.status, count: r._count._all })) };
  }

  static shape = shape;
}
module.exports = ShipmentService;
