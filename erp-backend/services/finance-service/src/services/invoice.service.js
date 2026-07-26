'use strict';
const { ApiError, utils, cache } = require('@erp/shared');
const InvoiceRepository = require('../repositories/invoice.repository');
const { SalesClient, PurchaseClient } = require('../clients/internal.client');
const tax = require('./tax.service');
const publisher = require('../events/publisher');
const {
  INVOICE_TYPE, INVOICE_STATUS, INVOICE_TRANSITIONS, PARTY_TYPE, SOURCE_TYPE, CACHE
} = require('../constants');
const config = require('../config');

function dec(v) { return v === null || v === undefined ? null : String(v); }

function shapeLine(l) {
  return {
    id: l.id, partId: l.partId, partCode: l.partCode, description: l.description, hsnCode: l.hsnCode,
    quantity: dec(l.quantity), unitPrice: dec(l.unitPrice), discountPct: dec(l.discountPct), taxRatePct: dec(l.taxRatePct),
    taxableValue: dec(l.taxableValue), cgst: dec(l.cgst), sgst: dec(l.sgst), igst: dec(l.igst), lineTotal: dec(l.lineTotal)
  };
}

function shape(i) {
  if (!i) return null;
  return {
    id: i.id, code: i.code, type: i.type, status: i.status,
    partyType: i.partyType, partyId: i.partyId, partyName: i.partyName,
    sourceType: i.sourceType, sourceId: i.sourceId, sourceCode: i.sourceCode,
    currencyCode: i.currencyCode, invoiceDate: i.invoiceDate, dueDate: i.dueDate, paymentTermDays: i.paymentTermDays,
    placeOfSupply: i.placeOfSupply, sellerGstin: i.sellerGstin, buyerGstin: i.buyerGstin, interState: i.interState,
    subtotal: dec(i.subtotal), discountTotal: dec(i.discountTotal), taxableTotal: dec(i.taxableTotal),
    cgstTotal: dec(i.cgstTotal), sgstTotal: dec(i.sgstTotal), igstTotal: dec(i.igstTotal), taxTotal: dec(i.taxTotal),
    roundOff: dec(i.roundOff), grandTotal: dec(i.grandTotal), amountPaid: dec(i.amountPaid), amountDue: dec(i.amountDue),
    notes: i.notes, issuedAt: i.issuedAt, cancelledAt: i.cancelledAt, cancelReason: i.cancelReason,
    lines: i.lines ? i.lines.map(shapeLine) : undefined,
    allocations: i.allocations ? i.allocations.map((a) => ({ id: a.id, paymentId: a.paymentId, amount: dec(a.amount) })) : undefined,
    lineCount: i._count ? i._count.lines : undefined,
    createdAt: i.createdAt, updatedAt: i.updatedAt
  };
}

function assertTransition(from, to) {
  const allowed = INVOICE_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) throw ApiError.conflict(`Illegal invoice status change ${from} -> ${to}`);
}

async function nextCode(type) {
  const year = new Date().getFullYear();
  const prefix = type === INVOICE_TYPE.SALES ? 'INV' : 'BILL';
  const n = await InvoiceRepository.countTypeYear(type, year).catch(() => 0);
  return `${prefix}-${year}-${String(n + 1).padStart(5, '0')}`;
}

function buildInvoiceData({ type, partyType, partyId, partyName, sourceType, sourceId, sourceCode, currencyCode, placeOfSupply, buyerGstin, paymentTermDays, rawLines, notes, user }) {
  const computed = tax.computeInvoice(rawLines, placeOfSupply);
  const t = computed.totals;
  const termDays = paymentTermDays ?? config.defaultPaymentTermDays;
  const dueDate = new Date(Date.now() + termDays * 86400 * 1000);

  return {
    data: {
      type,
      status: INVOICE_STATUS.DRAFT,
      partyType,
      partyId,
      partyName: partyName || null,
      sourceType: sourceType || SOURCE_TYPE.MANUAL,
      sourceId: sourceId || null,
      sourceCode: sourceCode || null,
      currencyCode: currencyCode || 'INR',
      dueDate,
      paymentTermDays: termDays,
      placeOfSupply: placeOfSupply || null,
      sellerGstin: config.sellerGstin || null,
      buyerGstin: buyerGstin || null,
      interState: computed.interState,
      subtotal: t.subtotal,
      discountTotal: t.discountTotal,
      taxableTotal: t.taxableTotal,
      cgstTotal: t.cgstTotal,
      sgstTotal: t.sgstTotal,
      igstTotal: t.igstTotal,
      taxTotal: t.taxTotal,
      roundOff: t.roundOff,
      grandTotal: t.grandTotal,
      amountPaid: 0,
      amountDue: t.grandTotal,
      notes: notes || null,
      createdBy: user ? user.id : null,
      updatedBy: user ? user.id : null,
      lines: {
        create: computed.lines.map((l) => ({
          partId: l.partId || null,
          partCode: l.partCode || null,
          description: l.description || null,
          hsnCode: l.hsnCode || null,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct || 0,
          taxRatePct: l.taxRatePct || 0,
          taxableValue: l.taxableValue,
          cgst: l.cgst, sgst: l.sgst, igst: l.igst,
          lineTotal: l.lineTotal
        }))
      }
    }
  };
}

class InvoiceService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, { allowedSortFields: ['createdAt', 'code', 'grandTotal', 'dueDate', 'invoiceDate'], defaultSortField: 'createdAt' });
    const where = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.partyId ? { partyId: query.partyId } : {}),
      ...(query.partyType ? { partyType: query.partyType } : {}),
      ...(query.overdueOnly ? { status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] }, dueDate: { lt: new Date() } } : {}),
      ...(query.search ? { OR: [{ code: { contains: query.search } }, { partyName: { contains: query.search } }, { sourceCode: { contains: query.search } }] } : {})
    };
    const { items, total } = await InvoiceRepository.paginate({ where, skip: pagination.skip, take: pagination.take, orderBy: pagination.orderBy });
    return { items: items.map(shape), total, page: pagination.page, limit: pagination.limit };
  }

  static async getById(id) {
    const i = await InvoiceRepository.findById(id);
    if (!i) throw ApiError.notFound('Invoice not found');
    return shape(i);
  }

  static async create(payload, user) {
    const { data } = buildInvoiceData({
      type: payload.type,
      partyType: payload.partyType,
      partyId: payload.partyId,
      partyName: payload.partyName,
      sourceType: payload.sourceType,
      sourceId: payload.sourceId,
      sourceCode: payload.sourceCode,
      currencyCode: payload.currencyCode,
      placeOfSupply: payload.placeOfSupply,
      buyerGstin: payload.buyerGstin,
      paymentTermDays: payload.paymentTermDays,
      rawLines: payload.lines,
      notes: payload.notes,
      user
    });
    data.code = await nextCode(payload.type);
    const invoice = await InvoiceRepository.create(data);
    await publisher.invoiceCreated(invoice, user ? user.id : null);
    return shape(invoice);
  }

  /** Build a draft SALES invoice from a confirmed sales order (idempotent). */
  static async draftFromSalesOrder(orderId, user) {
    const existing = await InvoiceRepository.findBySource(SOURCE_TYPE.SALES_ORDER, orderId, INVOICE_TYPE.SALES);
    if (existing) return shape(await InvoiceRepository.findById(existing.id));

    const order = await SalesClient.getOrder(orderId, user);
    if (!order) throw ApiError.badRequest('Sales order not found', { orderId });

    const rawLines = (order.lines || []).map((l) => ({
      partId: l.partId, partCode: l.partCode, description: l.description,
      quantity: Number(l.quantity), unitPrice: Number(l.unitPrice),
      discountPct: Number(l.discountPct || 0), taxRatePct: Number(l.taxRatePct || 0)
    }));

    const { data } = buildInvoiceData({
      type: INVOICE_TYPE.SALES,
      partyType: PARTY_TYPE.CUSTOMER,
      partyId: order.customerId,
      partyName: order.customerName,
      sourceType: SOURCE_TYPE.SALES_ORDER,
      sourceId: order.id,
      sourceCode: order.code,
      currencyCode: order.currencyCode,
      placeOfSupply: order.placeOfSupply || null,
      paymentTermDays: order.paymentTermDays,
      rawLines,
      notes: `Auto-drafted from sales order ${order.code}`,
      user
    });
    data.code = await nextCode(INVOICE_TYPE.SALES);
    const invoice = await InvoiceRepository.create(data);
    await publisher.invoiceCreated(invoice, user ? user.id : null);
    return shape(invoice);
  }

  /** Build a draft PURCHASE bill from a purchase order (idempotent). */
  static async draftFromPurchaseOrder(poId, user, override = {}) {
    const sourceType = override.sourceType || SOURCE_TYPE.PURCHASE_ORDER;
    const sourceId = override.sourceId || poId;
    const existing = await InvoiceRepository.findBySource(sourceType, sourceId, INVOICE_TYPE.PURCHASE);
    if (existing) return shape(await InvoiceRepository.findById(existing.id));

    const po = await PurchaseClient.getOrder(poId, user);
    if (!po) throw ApiError.badRequest('Purchase order not found', { poId });

    const rawLines = (po.lines || []).map((l) => ({
      partId: l.partId, partCode: l.partNumber, description: l.description,
      quantity: Number(l.quantity), unitPrice: Number(l.unitPrice),
      discountPct: Number(l.discountPercent || 0), taxRatePct: Number(l.taxPercent || 0)
    }));

    const { data } = buildInvoiceData({
      type: INVOICE_TYPE.PURCHASE,
      partyType: PARTY_TYPE.SUPPLIER,
      partyId: po.supplierId,
      partyName: po.supplierName,
      sourceType,
      sourceId,
      sourceCode: override.sourceCode || po.code,
      currencyCode: po.currencyCode,
      placeOfSupply: null,
      paymentTermDays: po.paymentTermDays,
      rawLines,
      notes: `Auto-drafted from purchase order ${po.code}`,
      user
    });
    data.code = await nextCode(INVOICE_TYPE.PURCHASE);
    const invoice = await InvoiceRepository.create(data);
    await publisher.invoiceCreated(invoice, user ? user.id : null);
    return shape(invoice);
  }

  static async createFromSalesOrder(orderId, user) { return InvoiceService.draftFromSalesOrder(orderId, user); }
  static async createFromPurchaseOrder(poId, user) { return InvoiceService.draftFromPurchaseOrder(poId, user); }

  static async issue(id, user) {
    const i = await InvoiceRepository.findById(id);
    if (!i) throw ApiError.notFound('Invoice not found');
    assertTransition(i.status, INVOICE_STATUS.ISSUED);
    if (!i.lines.length) throw ApiError.badRequest('Cannot issue an invoice with no lines');
    const updated = await InvoiceRepository.update(id, {
      status: INVOICE_STATUS.ISSUED, issuedAt: new Date(),
      dueDate: i.dueDate || new Date(Date.now() + i.paymentTermDays * 86400 * 1000),
      updatedBy: user.id
    });
    await cache.del(CACHE.invoice(id));
    await publisher.invoiceIssued(updated, user.id);
    return shape(updated);
  }

  static async cancel(id, reason, user) {
    const i = await InvoiceRepository.findById(id);
    if (!i) throw ApiError.notFound('Invoice not found');
    assertTransition(i.status, INVOICE_STATUS.CANCELLED);
    if (Number(i.amountPaid) > 0) throw ApiError.conflict('Cannot cancel an invoice that has payments allocated');
    const updated = await InvoiceRepository.update(id, { status: INVOICE_STATUS.CANCELLED, cancelledAt: new Date(), cancelReason: reason, updatedBy: user.id });
    await cache.del(CACHE.invoice(id));
    await publisher.invoiceCancelled(updated, reason, user.id);
    return shape(updated);
  }

  static async markOverdue(now) {
    const due = await InvoiceRepository.overdueCandidates(now);
    for (const inv of due) {
      const updated = await InvoiceRepository.update(inv.id, { status: INVOICE_STATUS.OVERDUE }).catch(() => null);
      if (updated) await publisher.invoiceOverdue(updated);
    }
    return { overdue: due.length };
  }

  static async stats() {
    const raw = await InvoiceRepository.stats();
    const byType = Object.fromEntries(raw.byType.map((r) => [r.type, dec(r._sum.amountDue || 0)]));
    return {
      byStatus: raw.byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      receivableOutstanding: byType.SALES || '0',
      payableOutstanding: byType.PURCHASE || '0',
      totalOutstanding: dec(raw.outstanding._sum.amountDue || 0)
    };
  }

  static shape = shape;
}
module.exports = InvoiceService;
