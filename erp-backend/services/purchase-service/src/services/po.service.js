'use strict';

const { ApiError, utils, cache } = require('@erp/shared');
const PoRepository = require('../repositories/po.repository');
const { MasterClient } = require('../clients/master.client');
const SupplierClient = require('../clients/supplier.client');
const publisher = require('../events/publisher');
const { PO_STATUS, STATUS_TRANSITIONS, CACHE } = require('../constants');
const config = require('../config');

function decimal(v) { return v === null || v === undefined ? null : String(v); }

function shapeLine(line) {
  return {
    id: line.id, lineNumber: line.lineNumber, partId: line.partId, partNumber: line.partNumber,
    description: line.description, quantity: line.quantity, uomCode: line.uomCode,
    unitPrice: decimal(line.unitPrice), discountPercent: decimal(line.discountPercent),
    taxPercent: decimal(line.taxPercent), lineTotal: decimal(line.lineTotal),
    receivedQty: line.receivedQty, rejectedQty: line.rejectedQty, closedQty: line.closedQty,
    pendingQty: line.quantity - line.receivedQty
  };
}

function shape(po) {
  return {
    id: po.id, code: po.code, supplierId: po.supplierId, supplierCode: po.supplierCode, supplierName: po.supplierName,
    status: po.status, rfqId: po.rfqId, currencyCode: po.currencyCode, paymentTermDays: po.paymentTermDays,
    incoterm: po.incoterm, deliveryAddress: po.deliveryAddress, expectedDate: po.expectedDate,
    subTotal: decimal(po.subTotal), taxTotal: decimal(po.taxTotal), grandTotal: decimal(po.grandTotal),
    requestedBy: po.requestedBy, approvalRequired: po.approvalRequired,
    submittedAt: po.submittedAt, approvedAt: po.approvedAt, approvedBy: po.approvedBy,
    rejectedAt: po.rejectedAt, rejectionReason: po.rejectionReason,
    cancelledAt: po.cancelledAt, cancelReason: po.cancelReason, closedAt: po.closedAt,
    notes: po.notes,
    lineCount: po._count ? po._count.lines : undefined,
    grnCount: po._count ? po._count.grns : undefined,
    lines: po.lines ? po.lines.map(shapeLine) : undefined,
    grns: po.grns,
    statusHistory: po.statusLogs,
    createdAt: po.createdAt, updatedAt: po.updatedAt
  };
}

function assertTransition(from, to) {
  const allowed = STATUS_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) throw ApiError.badRequest(`A PO cannot move from ${from} to ${to}`, { currentStatus: from, allowedNext: allowed });
}

function computeLine(line) {
  const gross = line.quantity * line.unitPrice;
  const discounted = gross * (1 - (line.discountPercent || 0) / 100);
  const tax = discounted * ((line.taxPercent || 0) / 100);
  return { subTotal: discounted, taxAmount: tax, lineTotal: discounted + tax };
}

class PoService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, { allowedSortFields: ['createdAt', 'code', 'grandTotal', 'expectedDate'], defaultSortField: 'createdAt' });
    const where = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.search ? { OR: [{ code: { contains: query.search } }, { supplierName: { contains: query.search } }] } : {})
    };
    const { items, total } = await PoRepository.paginate({ where, skip: pagination.skip, take: pagination.take, orderBy: pagination.orderBy });
    return { items: items.map(row => ({ ...row, grandTotal: decimal(row.grandTotal) })), total, page: pagination.page, limit: pagination.limit };
  }

  static async getById(id) {
    const po = await PoRepository.findById(id);
    if (!po) throw ApiError.notFound('Purchase order not found');
    return shape(po);
  }

  /** Creates a PO, verifying parts and supplier, computing totals and the approval gate. */
  static async create(payload, user) {
    const { missing } = await MasterClient.verifyParts(payload.lines.map(l => l.partId), user);
    if (missing.length) throw ApiError.badRequest('Some parts do not exist in the master data', { missingPartIds: missing });

    const supplier = await SupplierClient.getSupplier(payload.supplierId, user).catch(() => null);
    if (!supplier) throw ApiError.badRequest('Supplier not found', { field: 'supplierId' });
    if (supplier.status !== 'APPROVED') throw ApiError.badRequest(`Supplier is ${supplier.status}, not APPROVED`, { field: 'supplierId' });

    const code = await MasterClient.nextPoCode(user);

    let subTotal = 0, taxTotal = 0;
    const lines = payload.lines.map((line, index) => {
      const computed = computeLine(line);
      subTotal += computed.subTotal;
      taxTotal += computed.taxAmount;
      return {
        lineNumber: index + 1, partId: line.partId, partNumber: line.partNumber, description: line.description,
        quantity: line.quantity, uomCode: line.uomCode, unitPrice: line.unitPrice,
        discountPercent: line.discountPercent || 0, taxRateId: line.taxRateId || null, taxPercent: line.taxPercent || 0,
        lineTotal: computed.lineTotal
      };
    });

    const grandTotal = subTotal + taxTotal;
    const approvalRequired = grandTotal >= config.approvalThreshold;

    const po = await PoRepository.create({
      code,
      supplierId: payload.supplierId, supplierCode: supplier.code, supplierName: supplier.legalName,
      status: PO_STATUS.DRAFT,
      rfqId: payload.rfqId || null,
      currencyCode: payload.currencyCode || supplier.currencyCode || 'INR',
      paymentTermDays: payload.paymentTermDays ?? supplier.paymentTermDays ?? 30,
      incoterm: payload.incoterm || null,
      deliveryAddress: payload.deliveryAddress || null,
      expectedDate: payload.expectedDate ? new Date(payload.expectedDate) : null,
      subTotal: Number(subTotal.toFixed(2)), taxTotal: Number(taxTotal.toFixed(2)), grandTotal: Number(grandTotal.toFixed(2)),
      requestedBy: user.id, approvalRequired,
      notes: payload.notes || null
    }, lines, user.id);

    await PoRepository.logStatus({ poId: po.id, fromStatus: null, toStatus: PO_STATUS.DRAFT, reason: 'PO created', actorId: user.id });
    await publisher.poCreated(po, user.id);

    return shape(po);
  }

  static async update(id, payload, user) {
    const existing = await PoRepository.findRawById(id);
    if (!existing) throw ApiError.notFound('Purchase order not found');
    if (existing.status !== PO_STATUS.DRAFT) throw ApiError.badRequest('Only a DRAFT purchase order can be edited');

    const data = { ...payload };
    delete data.lines;
    if (data.expectedDate) data.expectedDate = new Date(data.expectedDate);

    const po = await PoRepository.update(id, data, user.id);
    return shape(po);
  }

  static async remove(id, user) {
    const existing = await PoRepository.findRawById(id);
    if (!existing) throw ApiError.notFound('Purchase order not found');
    if (existing.status !== PO_STATUS.DRAFT) throw ApiError.badRequest('Only a DRAFT purchase order can be deleted');
    await PoRepository.softDelete(id, user.id);
    return { deleted: true };
  }

  /** Skips the approval stage entirely when the PO is below the threshold. */
  static async submit(id, user) {
    const po = await PoRepository.findRawById(id);
    if (!po) throw ApiError.notFound('Purchase order not found');

    if (!po.approvalRequired) {
      assertTransition(po.status, PO_STATUS.ISSUED);
      const updated = await PoRepository.update(id, { status: PO_STATUS.ISSUED, submittedAt: new Date() }, user.id);
      await PoRepository.logStatus({ poId: id, fromStatus: po.status, toStatus: PO_STATUS.ISSUED, reason: 'Below approval threshold', actorId: user.id });
      await publisher.poIssued(updated, user.id);
      return shape(updated);
    }

    assertTransition(po.status, PO_STATUS.PENDING_APPROVAL);
    const updated = await PoRepository.update(id, { status: PO_STATUS.PENDING_APPROVAL, submittedAt: new Date() }, user.id);
    await PoRepository.logStatus({ poId: id, fromStatus: po.status, toStatus: PO_STATUS.PENDING_APPROVAL, actorId: user.id });
    return shape(updated);
  }

  static async approve(id, user) {
    const po = await PoRepository.findRawById(id);
    if (!po) throw ApiError.notFound('Purchase order not found');
    assertTransition(po.status, PO_STATUS.APPROVED);

    const updated = await PoRepository.update(id, { status: PO_STATUS.APPROVED, approvedAt: new Date(), approvedBy: user.id }, user.id);
    await PoRepository.logStatus({ poId: id, fromStatus: po.status, toStatus: PO_STATUS.APPROVED, actorId: user.id });
    await publisher.poApproved(updated, user.id);
    return shape(updated);
  }

  static async reject(id, reason, user) {
    const po = await PoRepository.findRawById(id);
    if (!po) throw ApiError.notFound('Purchase order not found');
    assertTransition(po.status, PO_STATUS.REJECTED);

    const updated = await PoRepository.update(id, { status: PO_STATUS.REJECTED, rejectedAt: new Date(), rejectedBy: user.id, rejectionReason: reason }, user.id);
    await PoRepository.logStatus({ poId: id, fromStatus: po.status, toStatus: PO_STATUS.REJECTED, reason, actorId: user.id });
    await publisher.poRejected(updated, reason, user.id);
    return shape(updated);
  }

  static async issue(id, user) {
    const po = await PoRepository.findRawById(id);
    if (!po) throw ApiError.notFound('Purchase order not found');
    assertTransition(po.status, PO_STATUS.ISSUED);

    const updated = await PoRepository.update(id, { status: PO_STATUS.ISSUED }, user.id);
    await PoRepository.logStatus({ poId: id, fromStatus: po.status, toStatus: PO_STATUS.ISSUED, actorId: user.id });
    await publisher.poIssued(updated, user.id);
    return shape(updated);
  }

  static async cancel(id, reason, user) {
    const po = await PoRepository.findRawById(id);
    if (!po) throw ApiError.notFound('Purchase order not found');
    assertTransition(po.status, PO_STATUS.CANCELLED);

    const updated = await PoRepository.update(id, { status: PO_STATUS.CANCELLED, cancelledAt: new Date(), cancelReason: reason }, user.id);
    await PoRepository.logStatus({ poId: id, fromStatus: po.status, toStatus: PO_STATUS.CANCELLED, reason, actorId: user.id });
    await publisher.poCancelled(updated, reason, user.id);
    return shape(updated);
  }

  static async close(id, user) {
    const po = await PoRepository.findRawById(id);
    if (!po) throw ApiError.notFound('Purchase order not found');
    assertTransition(po.status, PO_STATUS.CLOSED);

    const updated = await PoRepository.update(id, { status: PO_STATUS.CLOSED, closedAt: new Date() }, user.id);
    await PoRepository.logStatus({ poId: id, fromStatus: po.status, toStatus: PO_STATUS.CLOSED, actorId: user.id });
    await publisher.poClosed(updated, user.id);
    return shape(updated);
  }

  static async stats() {
    const raw = await PoRepository.stats();
    return {
      total: raw.totals._count._all, totalValue: decimal(raw.totals._sum.grandTotal),
      byStatus: raw.byStatus.map(r => ({ status: r.status, count: r._count._all, value: decimal(r._sum.grandTotal) }))
    };
  }

  static async scanOverdue() {
    const overdue = await PoRepository.overdue(new Date());
    if (overdue.length) await publisher.poOverdue(overdue);
    return { overdue: overdue.length };
  }

  static shape = shape;
  static shapeLine = shapeLine;
  static assertTransition = assertTransition;
  static computeLine = computeLine;
}

module.exports = PoService;
