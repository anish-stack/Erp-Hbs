'use strict';
const { ApiError, utils, cache } = require('@erp/shared');
const OrderRepository = require('../repositories/order.repository');
const MasterClient = require('../clients/master.client');
const CrmClient = require('../clients/crm.client');
const InventoryClient = require('../clients/inventory.client');
const pricing = require('./pricing.service');
const publisher = require('../events/publisher');
const { ORDER_STATUS, ORDER_TRANSITIONS, ORDER_EDITABLE, REF_TYPE, CACHE } = require('../constants');
const config = require('../config');

function dec(v) { return v === null || v === undefined ? null : String(v); }

function shapeLine(l) {
  return {
    id: l.id, partId: l.partId, partCode: l.partCode, description: l.description,
    quantity: dec(l.quantity), unitPrice: dec(l.unitPrice), discountPct: dec(l.discountPct),
    taxRatePct: dec(l.taxRatePct), lineTotal: dec(l.lineTotal),
    reservedQty: dec(l.reservedQty), shippedQty: dec(l.shippedQty), invoicedQty: dec(l.invoicedQty),
    reservationId: l.reservationId,
    openQty: dec(Math.max(0, Number(l.quantity) - Number(l.shippedQty)))
  };
}

function shape(o) {
  if (!o) return null;
  return {
    id: o.id, code: o.code, status: o.status, customerId: o.customerId, customerName: o.customerName,
    quotationId: o.quotationId, currencyCode: o.currencyCode, orderDate: o.orderDate, requiredDate: o.requiredDate,
    warehouseId: o.warehouseId,
    subtotal: dec(o.subtotal), discountTotal: dec(o.discountTotal), taxTotal: dec(o.taxTotal), grandTotal: dec(o.grandTotal),
    paymentTermDays: o.paymentTermDays, reserved: o.reserved, terms: o.terms, notes: o.notes,
    confirmedAt: o.confirmedAt, cancelledAt: o.cancelledAt, cancelReason: o.cancelReason, closedAt: o.closedAt,
    lines: o.lines ? o.lines.map(shapeLine) : undefined,
    lineCount: o._count ? o._count.lines : undefined,
    createdAt: o.createdAt, updatedAt: o.updatedAt
  };
}

function assertTransition(from, to) {
  const allowed = ORDER_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) throw ApiError.conflict(`Illegal order status change ${from} -> ${to}`);
}

async function nextCode() {
  const year = new Date().getFullYear();
  const n = await OrderRepository.countYear(year).catch(() => 0);
  return `SO-${year}-${String(n + 1).padStart(5, '0')}`;
}

async function buildLines(rawLines, user) {
  const partIds = [...new Set(rawLines.map((l) => l.partId))];
  const results = await Promise.allSettled(partIds.map((id) => MasterClient.getPart(id, user)));
  const missing = partIds.filter((id, i) => results[i].status === 'rejected');
  if (missing.length) throw ApiError.badRequest('Some parts do not exist in master data', { missing });
  const partMap = new Map();
  results.forEach((r, i) => { if (r.status === 'fulfilled' && r.value) partMap.set(partIds[i], r.value); });

  return rawLines.map((l) => {
    const c = pricing.computeLine(l);
    const part = partMap.get(l.partId);
    return {
      partId: l.partId,
      partCode: l.partCode || (part ? part.code || part.partNumber : null),
      description: l.description || (part ? part.name : null),
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPct: l.discountPct || 0,
      taxRatePct: l.taxRatePct || 0,
      lineTotal: c.lineTotal
    };
  });
}

class OrderService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, { allowedSortFields: ['createdAt', 'code', 'grandTotal', 'orderDate'], defaultSortField: 'createdAt' });
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.search ? { OR: [{ code: { contains: query.search } }, { customerName: { contains: query.search } }] } : {})
    };
    const { items, total } = await OrderRepository.paginate({ where, skip: pagination.skip, take: pagination.take, orderBy: pagination.orderBy });
    return { items: items.map(shape), total, page: pagination.page, limit: pagination.limit };
  }

  static async getById(id) {
    const o = await OrderRepository.findById(id);
    if (!o) throw ApiError.notFound('Sales order not found');
    return shape(o);
  }

  static async create(payload, user) {
    const customer = await CrmClient.getCustomer(payload.customerId, user).catch(() => null);
    if (!customer) throw ApiError.badRequest('Customer not found in CRM', { customerId: payload.customerId });

    const lines = await buildLines(payload.lines, user);
    const totals = pricing.computeTotals(lines);

    const o = await OrderRepository.create({
      code: await nextCode(),
      status: ORDER_STATUS.DRAFT,
      customerId: payload.customerId,
      customerName: customer.name || customer.legalName || payload.customerName || null,
      quotationId: payload.quotationId || null,
      currencyCode: payload.currencyCode || 'INR',
      requiredDate: payload.requiredDate ? new Date(payload.requiredDate) : null,
      warehouseId: payload.warehouseId || config.defaultWarehouseId,
      subtotal: totals.subtotal, discountTotal: totals.discountTotal, taxTotal: totals.taxTotal, grandTotal: totals.grandTotal,
      paymentTermDays: payload.paymentTermDays ?? 30,
      terms: payload.terms || null,
      notes: payload.notes || null,
      createdBy: user.id, updatedBy: user.id,
      lines: { create: lines }
    });

    await publisher.orderCreated(o, user.id);
    return shape(o);
  }

  /** Internal: build a draft order straight from an accepted quotation. */
  static async createFromQuotation(quotation, payload, user) {
    const lines = quotation.lines.map((l) => ({
      partId: l.partId, partCode: l.partCode, description: l.description,
      quantity: l.quantity, unitPrice: l.unitPrice, discountPct: l.discountPct, taxRatePct: l.taxRatePct, lineTotal: l.lineTotal
    }));
    const o = await OrderRepository.create({
      code: await nextCode(),
      status: ORDER_STATUS.DRAFT,
      customerId: quotation.customerId,
      customerName: quotation.customerName,
      quotationId: quotation.id,
      currencyCode: quotation.currencyCode,
      requiredDate: payload.requiredDate ? new Date(payload.requiredDate) : null,
      warehouseId: payload.warehouseId || config.defaultWarehouseId,
      subtotal: quotation.subtotal, discountTotal: quotation.discountTotal, taxTotal: quotation.taxTotal, grandTotal: quotation.grandTotal,
      paymentTermDays: payload.paymentTermDays ?? 30,
      terms: quotation.terms, notes: quotation.notes,
      createdBy: user.id, updatedBy: user.id,
      lines: { create: lines }
    });
    await publisher.orderCreated(o, user.id);
    return shape(o);
  }

  static async update(id, payload, user) {
    const o = await OrderRepository.findById(id);
    if (!o) throw ApiError.notFound('Sales order not found');
    if (!ORDER_EDITABLE.includes(o.status)) throw ApiError.conflict('Only draft orders can be edited');

    let totals = { subtotal: o.subtotal, discountTotal: o.discountTotal, taxTotal: o.taxTotal, grandTotal: o.grandTotal };
    if (payload.lines) {
      const lines = await buildLines(payload.lines, user);
      totals = pricing.computeTotals(lines);
      await OrderRepository.replaceLines(id, lines);
    }
    const updated = await OrderRepository.update(id, {
      customerName: payload.customerName ?? o.customerName,
      requiredDate: payload.requiredDate ? new Date(payload.requiredDate) : o.requiredDate,
      warehouseId: payload.warehouseId ?? o.warehouseId,
      paymentTermDays: payload.paymentTermDays ?? o.paymentTermDays,
      terms: payload.terms ?? o.terms,
      notes: payload.notes ?? o.notes,
      subtotal: totals.subtotal, discountTotal: totals.discountTotal, taxTotal: totals.taxTotal, grandTotal: totals.grandTotal,
      updatedBy: user.id
    });
    await cache.del(CACHE.order(id));
    return shape(updated);
  }

  /**
   * Confirms a draft order. Reserves stock per line in the Inventory service.
   * A shortfall is reported but does not block confirmation; unreserved lines
   * can be reserved later once stock arrives.
   */
  static async confirm(id, user) {
    const o = await OrderRepository.findById(id);
    if (!o) throw ApiError.notFound('Sales order not found');
    assertTransition(o.status, ORDER_STATUS.CONFIRMED);
    if (!o.lines.length) throw ApiError.badRequest('Add at least one line before confirming');

    const warehouseId = o.warehouseId || config.defaultWarehouseId;
    if (!warehouseId) throw ApiError.badRequest('Order has no warehouse and no DEFAULT_WAREHOUSE_ID is set');

    const shortfalls = [];

    if (config.autoReserveOnConfirm) {
      for (const line of o.lines) {
        if (Number(line.reservedQty) >= Number(line.quantity)) continue;
        try {
          const reservation = await InventoryClient.reserve(
            {
              partId: line.partId,
              warehouseId,
              quantity: Number(line.quantity),
              refType: REF_TYPE.SALES_ORDER,
              refId: o.id,
              refCode: o.code
            },
            user
          );
          await OrderRepository.updateLine(line.id, { reservedQty: line.quantity, reservationId: reservation.id });
        } catch (err) {
          shortfalls.push({ partId: line.partId, partCode: line.partCode, quantity: String(line.quantity), reason: err.message });
        }
      }
    }

    const updated = await OrderRepository.update(id, {
      status: ORDER_STATUS.CONFIRMED,
      warehouseId,
      reserved: shortfalls.length === 0,
      confirmedAt: new Date(),
      updatedBy: user.id
    });

    await cache.del(CACHE.order(id));
    await publisher.orderConfirmed(updated, user.id);
    if (shortfalls.length) await publisher.reservationShortfall(updated, shortfalls, user.id);

    return { order: shape(updated), shortfalls };
  }

  static async cancel(id, reason, user) {
    const o = await OrderRepository.findById(id);
    if (!o) throw ApiError.notFound('Sales order not found');
    assertTransition(o.status, ORDER_STATUS.CANCELLED);

    // Best-effort release of any live reservations; Inventory also releases on
    // the sales.order.cancelled event, so this is belt-and-braces.
    for (const line of o.lines) {
      if (line.reservationId) {
        await InventoryClient.releaseReservation(line.reservationId, user).catch(() => {});
      }
    }

    const updated = await OrderRepository.update(id, {
      status: ORDER_STATUS.CANCELLED, cancelledAt: new Date(), cancelReason: reason, reserved: false, updatedBy: user.id
    });
    await cache.del(CACHE.order(id));
    await publisher.orderCancelled(updated, reason, user.id);
    return shape(updated);
  }

  static async close(id, user) {
    const o = await OrderRepository.findById(id);
    if (!o) throw ApiError.notFound('Sales order not found');
    assertTransition(o.status, ORDER_STATUS.CLOSED);
    const updated = await OrderRepository.update(id, { status: ORDER_STATUS.CLOSED, closedAt: new Date(), updatedBy: user.id });
    await publisher.orderClosed(updated, user.id);
    return shape(updated);
  }

  /** Applies shipped quantities (from a shipment.dispatched event) and rolls up status. */
  static async applyShipment(orderId, lines, actorId) {
    const o = await OrderRepository.findById(orderId);
    if (!o) return null;

    const byPart = new Map(lines.map((l) => [l.partId, Number(l.quantity || l.shippedQty || 0)]));
    for (const line of o.lines) {
      const add = byPart.get(line.partId) || 0;
      if (add > 0) {
        const shipped = Math.min(Number(line.quantity), Number(line.shippedQty) + add);
        await OrderRepository.updateLine(line.id, { shippedQty: shipped });
      }
    }

    const refreshed = await OrderRepository.findById(orderId);
    const allShipped = refreshed.lines.every((l) => Number(l.shippedQty) >= Number(l.quantity));
    const anyShipped = refreshed.lines.some((l) => Number(l.shippedQty) > 0);
    const status = allShipped ? ORDER_STATUS.FULFILLED : anyShipped ? ORDER_STATUS.PARTIALLY_FULFILLED : refreshed.status;

    if (status !== refreshed.status) {
      const updated = await OrderRepository.update(orderId, { status });
      if (status === ORDER_STATUS.FULFILLED) await publisher.orderFulfilled(updated, actorId);
      else await publisher.orderPartial(updated, actorId);
    }
    await cache.del(CACHE.order(orderId));
    return shape(await OrderRepository.findById(orderId));
  }

  static async stats() {
    const raw = await OrderRepository.stats();
    return {
      total: raw.totals._count._all,
      grandTotal: dec(raw.totals._sum.grandTotal || 0),
      byStatus: raw.byStatus.map((r) => ({ status: r.status, count: r._count._all }))
    };
  }

  static shape = shape;
}
module.exports = OrderService;
