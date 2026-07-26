'use strict';
const { ApiError, utils, cache } = require('@erp/shared');
const QuotationRepository = require('../repositories/quotation.repository');
const MasterClient = require('../clients/master.client');
const CrmClient = require('../clients/crm.client');
const OrderService = require('./order.service');
const pricing = require('./pricing.service');
const publisher = require('../events/publisher');
const { QUOTATION_STATUS, QUOTATION_TRANSITIONS, CACHE } = require('../constants');
const config = require('../config');

function dec(v) { return v === null || v === undefined ? null : String(v); }

function shapeLine(l) {
  return {
    id: l.id, partId: l.partId, partCode: l.partCode, description: l.description,
    quantity: dec(l.quantity), unitPrice: dec(l.unitPrice), discountPct: dec(l.discountPct),
    taxRatePct: dec(l.taxRatePct), lineTotal: dec(l.lineTotal)
  };
}

function shape(q) {
  if (!q) return null;
  return {
    id: q.id, code: q.code, status: q.status, customerId: q.customerId, customerName: q.customerName,
    currencyCode: q.currencyCode, quoteDate: q.quoteDate, validUntil: q.validUntil,
    subtotal: dec(q.subtotal), discountTotal: dec(q.discountTotal), taxTotal: dec(q.taxTotal), grandTotal: dec(q.grandTotal),
    terms: q.terms, notes: q.notes, convertedOrderId: q.convertedOrderId,
    lines: q.lines ? q.lines.map(shapeLine) : undefined,
    lineCount: q._count ? q._count.lines : undefined,
    createdAt: q.createdAt, updatedAt: q.updatedAt
  };
}

function assertTransition(from, to) {
  const allowed = QUOTATION_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) throw ApiError.conflict(`Illegal quotation status change ${from} -> ${to}`);
}

async function nextCode() {
  const year = new Date().getFullYear();
  const n = await QuotationRepository.countYear(year).catch(() => 0);
  return `QTN-${year}-${String(n + 1).padStart(5, '0')}`;
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

class QuotationService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, { allowedSortFields: ['createdAt', 'code', 'grandTotal'], defaultSortField: 'createdAt' });
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.search ? { OR: [{ code: { contains: query.search } }, { customerName: { contains: query.search } }] } : {})
    };
    const { items, total } = await QuotationRepository.paginate({ where, skip: pagination.skip, take: pagination.take, orderBy: pagination.orderBy });
    return { items: items.map(shape), total, page: pagination.page, limit: pagination.limit };
  }

  static async getById(id) {
    const q = await QuotationRepository.findById(id);
    if (!q) throw ApiError.notFound('Quotation not found');
    return shape(q);
  }

  static async create(payload, user) {
    const customer = await CrmClient.getCustomer(payload.customerId, user).catch(() => null);
    if (!customer) throw ApiError.badRequest('Customer not found in CRM', { customerId: payload.customerId });

    const lines = await buildLines(payload.lines, user);
    const totals = pricing.computeTotals(lines);
    const validUntil = payload.validUntil
      ? new Date(payload.validUntil)
      : new Date(Date.now() + config.quotationValidDays * 86400 * 1000);

    const q = await QuotationRepository.create({
      code: await nextCode(),
      status: QUOTATION_STATUS.DRAFT,
      customerId: payload.customerId,
      customerName: customer.name || customer.legalName || payload.customerName || null,
      currencyCode: payload.currencyCode || 'INR',
      validUntil,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      terms: payload.terms || null,
      notes: payload.notes || null,
      createdBy: user.id,
      updatedBy: user.id,
      lines: { create: lines }
    });

    await publisher.quotationCreated(q, user.id);
    return shape(q);
  }

  static async update(id, payload, user) {
    const q = await QuotationRepository.findById(id);
    if (!q) throw ApiError.notFound('Quotation not found');
    if (q.status !== QUOTATION_STATUS.DRAFT) throw ApiError.conflict('Only draft quotations can be edited');

    let totals = { subtotal: q.subtotal, discountTotal: q.discountTotal, taxTotal: q.taxTotal, grandTotal: q.grandTotal };
    if (payload.lines) {
      const lines = await buildLines(payload.lines, user);
      totals = pricing.computeTotals(lines);
      await QuotationRepository.replaceLines(id, lines);
    }
    const updated = await QuotationRepository.update(id, {
      customerName: payload.customerName ?? q.customerName,
      currencyCode: payload.currencyCode ?? q.currencyCode,
      validUntil: payload.validUntil ? new Date(payload.validUntil) : q.validUntil,
      terms: payload.terms ?? q.terms,
      notes: payload.notes ?? q.notes,
      subtotal: totals.subtotal, discountTotal: totals.discountTotal, taxTotal: totals.taxTotal, grandTotal: totals.grandTotal,
      updatedBy: user.id
    });
    await cache.del(CACHE.quotation(id));
    return shape(updated);
  }

  static async setStatus(id, status, user, extra = {}) {
    const q = await QuotationRepository.findById(id);
    if (!q) throw ApiError.notFound('Quotation not found');
    assertTransition(q.status, status);
    const updated = await QuotationRepository.update(id, { status, updatedBy: user.id, ...extra });
    await cache.del(CACHE.quotation(id));
    if (status === QUOTATION_STATUS.SENT) await publisher.quotationSent(updated, user.id);
    if (status === QUOTATION_STATUS.ACCEPTED) await publisher.quotationAccepted(updated, user.id);
    return shape(updated);
  }

  static async send(id, user) { return QuotationService.setStatus(id, QUOTATION_STATUS.SENT, user); }
  static async accept(id, user) { return QuotationService.setStatus(id, QUOTATION_STATUS.ACCEPTED, user); }
  static async reject(id, user) { return QuotationService.setStatus(id, QUOTATION_STATUS.REJECTED, user); }

  /** Turns an accepted quotation into a draft sales order. */
  static async convert(id, payload, user) {
    const q = await QuotationRepository.findById(id);
    if (!q) throw ApiError.notFound('Quotation not found');
    if (q.status !== QUOTATION_STATUS.ACCEPTED) throw ApiError.conflict('Only an accepted quotation can be converted');
    if (q.convertedOrderId) throw ApiError.conflict('Quotation already converted', { orderId: q.convertedOrderId });

    const order = await OrderService.createFromQuotation(q, payload || {}, user);
    const updated = await QuotationRepository.update(id, { status: QUOTATION_STATUS.CONVERTED, convertedOrderId: order.id, updatedBy: user.id });
    await publisher.quotationConverted(updated, order.id, user.id);
    return { quotation: shape(updated), order };
  }

  static async expireDue() {
    const due = await QuotationRepository.expirable(new Date());
    for (const q of due) {
      await QuotationRepository.update(q.id, { status: QUOTATION_STATUS.EXPIRED }).catch(() => {});
    }
    return { expired: due.length };
  }

  static shape = shape;
}
module.exports = QuotationService;
