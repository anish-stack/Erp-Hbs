'use strict';
const { ApiError, utils, cache } = require('@erp/shared');
const { prisma } = require('../config/prisma');
const PaymentRepository = require('../repositories/payment.repository');
const publisher = require('../events/publisher');
const {
  INVOICE_TYPE, INVOICE_STATUS, PARTY_TYPE, PAYMENT_DIRECTION, PAYMENT_STATUS, CACHE
} = require('../constants');

function round(v) { return Math.round((Number(v) + Number.EPSILON) * 100) / 100; }
function dec(v) { return v === null || v === undefined ? null : String(v); }

function shape(p) {
  if (!p) return null;
  return {
    id: p.id, code: p.code, direction: p.direction, status: p.status,
    partyType: p.partyType, partyId: p.partyId, partyName: p.partyName,
    method: p.method, reference: p.reference,
    amount: dec(p.amount), allocatedAmount: dec(p.allocatedAmount),
    unallocatedAmount: dec(round(Number(p.amount) - Number(p.allocatedAmount))),
    currencyCode: p.currencyCode, paymentDate: p.paymentDate, notes: p.notes,
    allocations: p.allocations ? p.allocations.map((a) => ({
      id: a.id, invoiceId: a.invoiceId, amount: dec(a.amount),
      invoiceCode: a.invoice ? a.invoice.code : undefined, invoiceType: a.invoice ? a.invoice.type : undefined
    })) : undefined,
    allocationCount: p._count ? p._count.allocations : undefined,
    createdAt: p.createdAt, updatedAt: p.updatedAt
  };
}

function statusFor(grandTotal, amountPaid) {
  if (amountPaid <= 0) return INVOICE_STATUS.ISSUED;
  if (amountPaid + 0.01 < grandTotal) return INVOICE_STATUS.PARTIALLY_PAID;
  return INVOICE_STATUS.PAID;
}

async function nextCode() {
  const year = new Date().getFullYear();
  const n = await PaymentRepository.countYear(year).catch(() => 0);
  return `PAY-${year}-${String(n + 1).padStart(5, '0')}`;
}

class PaymentService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, { allowedSortFields: ['createdAt', 'code', 'amount', 'paymentDate'], defaultSortField: 'createdAt' });
    const where = {
      ...(query.direction ? { direction: query.direction } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.partyId ? { partyId: query.partyId } : {}),
      ...(query.method ? { method: query.method } : {}),
      ...(query.search ? { OR: [{ code: { contains: query.search } }, { partyName: { contains: query.search } }, { reference: { contains: query.search } }] } : {})
    };
    const { items, total } = await PaymentRepository.paginate({ where, skip: pagination.skip, take: pagination.take, orderBy: pagination.orderBy });
    return { items: items.map(shape), total, page: pagination.page, limit: pagination.limit };
  }

  static async getById(id) {
    const p = await PaymentRepository.findById(id);
    if (!p) throw ApiError.notFound('Payment not found');
    return shape(p);
  }

  /**
   * Records a payment and (optionally) allocates it across invoices in one
   * atomic transaction. Each allocated invoice has its amountPaid / amountDue
   * and status recomputed; over-allocation beyond an invoice's due amount or
   * beyond the payment amount is rejected.
   */
  static async create(payload, user) {
    const allocations = payload.allocations || [];
    const direction = payload.partyType === PARTY_TYPE.CUSTOMER ? PAYMENT_DIRECTION.INBOUND : PAYMENT_DIRECTION.OUTBOUND;
    const expectedType = payload.partyType === PARTY_TYPE.CUSTOMER ? INVOICE_TYPE.SALES : INVOICE_TYPE.PURCHASE;

    const result = await prisma.$transaction(async (tx) => {
      let allocatedTotal = 0;
      const targets = [];

      for (const alloc of allocations) {
        const invoice = await tx.invoice.findUnique({ where: { id: alloc.invoiceId } });
        if (!invoice) throw ApiError.badRequest('Invoice not found', { invoiceId: alloc.invoiceId });
        if (invoice.type !== expectedType) throw ApiError.badRequest('Invoice type does not match payment party type', { invoiceId: alloc.invoiceId });
        if ([INVOICE_STATUS.DRAFT, INVOICE_STATUS.CANCELLED].includes(invoice.status)) {
          throw ApiError.conflict('Cannot allocate to a draft or cancelled invoice', { invoiceId: alloc.invoiceId, status: invoice.status });
        }
        const due = Number(invoice.amountDue);
        const amt = round(Number(alloc.amount));
        if (amt <= 0) throw ApiError.badRequest('Allocation amount must be positive');
        if (amt > due + 0.01) throw ApiError.badRequest(`Allocation ${amt} exceeds invoice due ${due}`, { invoiceId: alloc.invoiceId });
        allocatedTotal = round(allocatedTotal + amt);
        targets.push({ invoice, amount: amt });
      }

      const amount = round(Number(payload.amount));
      if (allocatedTotal > amount + 0.01) throw ApiError.badRequest(`Allocations (${allocatedTotal}) exceed payment amount (${amount})`);

      const payment = await tx.payment.create({
        data: {
          code: await nextCode(),
          direction,
          status: payload.status || PAYMENT_STATUS.COMPLETED,
          partyType: payload.partyType,
          partyId: payload.partyId,
          partyName: payload.partyName || null,
          method: payload.method || 'BANK',
          reference: payload.reference || null,
          amount,
          allocatedAmount: allocatedTotal,
          currencyCode: payload.currencyCode || 'INR',
          paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : new Date(),
          notes: payload.notes || null,
          createdBy: user.id,
          updatedBy: user.id,
          allocations: { create: targets.map((t) => ({ invoiceId: t.invoice.id, amount: t.amount })) }
        }
      });

      const paidInvoices = [];
      for (const t of targets) {
        const newPaid = round(Number(t.invoice.amountPaid) + t.amount);
        const newDue = round(Number(t.invoice.grandTotal) - newPaid);
        const status = statusFor(Number(t.invoice.grandTotal), newPaid);
        const updated = await tx.invoice.update({
          where: { id: t.invoice.id },
          data: { amountPaid: newPaid, amountDue: newDue < 0 ? 0 : newDue, status }
        });
        if (status === INVOICE_STATUS.PAID) paidInvoices.push(updated);
      }

      return { payment, paidInvoices };
    });

    await publisher.paymentRecorded(result.payment, user.id);
    for (const inv of result.paidInvoices) {
      await cache.del(CACHE.invoice(inv.id));
      await publisher.invoicePaid(inv, user.id);
    }

    return PaymentService.getById(result.payment.id);
  }

  static async stats() {
    const [inbound, outbound] = await Promise.all([
      PaymentRepository.prisma.payment.aggregate({ where: { direction: PAYMENT_DIRECTION.INBOUND, status: PAYMENT_STATUS.COMPLETED }, _sum: { amount: true } }),
      PaymentRepository.prisma.payment.aggregate({ where: { direction: PAYMENT_DIRECTION.OUTBOUND, status: PAYMENT_STATUS.COMPLETED }, _sum: { amount: true } })
    ]);
    return { inboundTotal: dec(inbound._sum.amount || 0), outboundTotal: dec(outbound._sum.amount || 0) };
  }

  static shape = shape;
}
module.exports = PaymentService;
