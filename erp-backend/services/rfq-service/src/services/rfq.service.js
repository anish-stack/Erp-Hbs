'use strict';

const { ApiError, utils, cache } = require('@erp/shared');
const RfqRepository = require('../repositories/rfq.repository');
const { MasterClient } = require('../clients/master.client');
const SupplierClient = require('../clients/supplier.client');
const publisher = require('../events/publisher');
const { RFQ_STATUS, STATUS_TRANSITIONS, CACHE } = require('../constants');
const config = require('../config');

function decimal(v) { return v === null || v === undefined ? null : String(v); }

function shapeLine(line) {
  return {
    id: line.id,
    lineNumber: line.lineNumber,
    partId: line.partId,
    partNumber: line.partNumber,
    description: line.description,
    quantity: line.quantity,
    uomCode: line.uomCode,
    targetPrice: decimal(line.targetPrice),
    specifications: line.specifications || null,
    notes: line.notes,
    awardedSupplierId: line.awardedSupplierId,
    awardedQty: line.awardedQty,
    awardedPrice: decimal(line.awardedPrice),
    quotesReceived: line.quoteLines ? line.quoteLines.length : undefined
  };
}

function shapeSupplier(rfqSupplier) {
  return {
    id: rfqSupplier.id,
    supplierId: rfqSupplier.supplierId,
    supplierCode: rfqSupplier.supplierCode,
    supplierName: rfqSupplier.supplierName,
    status: rfqSupplier.status,
    invitedAt: rfqSupplier.invitedAt,
    respondedAt: rfqSupplier.respondedAt,
    declinedReason: rfqSupplier.declinedReason,
    hasQuote: Boolean(rfqSupplier.quote)
  };
}

function shape(rfq) {
  return {
    id: rfq.id,
    code: rfq.code,
    title: rfq.title,
    status: rfq.status,
    currencyCode: rfq.currencyCode,
    requestedBy: rfq.requestedBy,
    departmentId: rfq.departmentId,
    validTill: rfq.validTill,
    responseDeadline: rfq.responseDeadline,
    notes: rfq.notes,
    cancelReason: rfq.cancelReason,
    sentAt: rfq.sentAt,
    closedAt: rfq.closedAt,
    cancelledAt: rfq.cancelledAt,
    awardedAt: rfq.awardedAt,
    lineCount: rfq._count ? rfq._count.lines : undefined,
    supplierCount: rfq._count ? rfq._count.suppliers : undefined,
    lines: rfq.lines ? rfq.lines.map(shapeLine) : undefined,
    suppliers: rfq.suppliers ? rfq.suppliers.map(shapeSupplier) : undefined,
    statusHistory: rfq.statusLogs,
    createdAt: rfq.createdAt,
    updatedAt: rfq.updatedAt
  };
}

function assertTransition(from, to) {
  const allowed = STATUS_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw ApiError.badRequest(`An RFQ cannot move from ${from} to ${to}`, { currentStatus: from, allowedNext: allowed });
  }
}

class RfqService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['createdAt', 'code', 'validTill', 'responseDeadline'],
      defaultSortField: 'createdAt'
    });

    const where = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.requestedBy ? { requestedBy: query.requestedBy } : {}),
      ...(query.search ? { OR: [{ code: { contains: query.search } }, { title: { contains: query.search } }] } : {})
    };

    const { items, total } = await RfqRepository.paginate({ where, skip: pagination.skip, take: pagination.take, orderBy: pagination.orderBy });
    return { items: items.map(shape), total, page: pagination.page, limit: pagination.limit };
  }

  static async getById(id) {
    const rfq = await RfqRepository.findById(id);
    if (!rfq) throw ApiError.notFound('RFQ not found');
    return shape(rfq);
  }

  static async create(payload, user) {
    const { missing } = await MasterClient.verifyParts(payload.lines.map((l) => l.partId), user);
    if (missing.length) {
      throw ApiError.badRequest('Some parts do not exist in the master data', { missingPartIds: missing });
    }

    const code = await MasterClient.nextRfqCode(user);
    const validTill = payload.validTill
      ? new Date(payload.validTill)
      : new Date(Date.now() + config.defaultValidityDays * 86400000);

    const lines = payload.lines.map((line, index) => ({
      lineNumber: index + 1,
      partId: line.partId,
      partNumber: line.partNumber,
      description: line.description,
      quantity: line.quantity,
      uomCode: line.uomCode,
      targetPrice: line.targetPrice ?? null,
      specifications: line.specifications || null,
      notes: line.notes || null
    }));

    const rfq = await RfqRepository.create(
      {
        code,
        title: payload.title,
        status: RFQ_STATUS.DRAFT,
        requestedBy: user.id,
        departmentId: payload.departmentId || null,
        currencyCode: payload.currencyCode || 'INR',
        validTill,
        responseDeadline: payload.responseDeadline ? new Date(payload.responseDeadline) : null,
        notes: payload.notes || null
      },
      lines,
      user.id
    );

    await RfqRepository.logStatus({ rfqId: rfq.id, fromStatus: null, toStatus: RFQ_STATUS.DRAFT, reason: 'RFQ created', actorId: user.id });

    return shape(rfq);
  }

  static async update(id, payload, user) {
    const existing = await RfqRepository.findRawById(id);
    if (!existing) throw ApiError.notFound('RFQ not found');
    if (existing.status !== RFQ_STATUS.DRAFT) {
      throw ApiError.badRequest('Only a DRAFT RFQ can be edited');
    }

    const data = { ...payload };
    delete data.lines;
    if (data.validTill) data.validTill = new Date(data.validTill);
    if (data.responseDeadline) data.responseDeadline = new Date(data.responseDeadline);

    const rfq = await RfqRepository.update(id, data, user.id);
    return shape(rfq);
  }

  static async remove(id, user) {
    const existing = await RfqRepository.findRawById(id);
    if (!existing) throw ApiError.notFound('RFQ not found');
    if (existing.status !== RFQ_STATUS.DRAFT) {
      throw ApiError.badRequest('Only a DRAFT RFQ can be deleted');
    }
    await RfqRepository.softDelete(id, user.id);
    return { deleted: true };
  }

  /** Invites suppliers. Only APPROVED, transactable suppliers are accepted. */
  static async addSuppliers(id, supplierIds, user) {
    const rfq = await RfqRepository.findRawById(id);
    if (!rfq) throw ApiError.notFound('RFQ not found');
    if (![RFQ_STATUS.DRAFT, RFQ_STATUS.SENT].includes(rfq.status)) {
      throw ApiError.badRequest('Suppliers can only be added while the RFQ is DRAFT or SENT');
    }

    const { resolved, missing, notApproved } = await SupplierClient.verifySuppliers(supplierIds, user);

    if (missing.length || notApproved.length) {
      throw ApiError.badRequest('Some suppliers cannot be invited', { missingSupplierIds: missing, notApproved });
    }

    await RfqRepository.addSuppliers(
      id,
      resolved.map((s) => ({ supplierId: s.id, supplierCode: s.code, supplierName: s.legalName }))
    );

    if (rfq.status === RFQ_STATUS.SENT) {
      for (const supplier of resolved) await publisher.createdForSupplier(rfq, supplier.id, user.id);
    }

    return RfqService.getById(id);
  }

  static async removeSupplier(id, supplierId, user) {
    const rfq = await RfqRepository.findRawById(id);
    if (!rfq) throw ApiError.notFound('RFQ not found');
    if (rfq.status !== RFQ_STATUS.DRAFT) {
      throw ApiError.badRequest('Suppliers can only be removed while the RFQ is DRAFT');
    }
    await RfqRepository.removeSupplier(id, supplierId);
    return { removed: true };
  }

  /** DRAFT -> SENT. Invites every attached supplier and fires one event each. */
  static async send(id, user) {
    const rfq = await RfqRepository.findById(id);
    if (!rfq) throw ApiError.notFound('RFQ not found');

    assertTransition(rfq.status, RFQ_STATUS.SENT);

    if (!rfq.lines.length) throw ApiError.badRequest('RFQ must have at least one line before it can be sent');
    if (!rfq.suppliers.length) throw ApiError.badRequest('RFQ must have at least one invited supplier before it can be sent');

    const updated = await RfqRepository.update(id, { status: RFQ_STATUS.SENT, sentAt: new Date() }, user.id);
    await RfqRepository.logStatus({ rfqId: id, fromStatus: rfq.status, toStatus: RFQ_STATUS.SENT, actorId: user.id });

    const supplierIds = rfq.suppliers.map((s) => s.supplierId);
    for (const supplierId of supplierIds) await publisher.createdForSupplier(updated, supplierId, user.id);
    await publisher.sent(updated, supplierIds, user.id);

    return RfqService.getById(id);
  }

  static async cancel(id, reason, user) {
    const rfq = await RfqRepository.findRawById(id);
    if (!rfq) throw ApiError.notFound('RFQ not found');

    assertTransition(rfq.status, RFQ_STATUS.CANCELLED);

    const updated = await RfqRepository.update(id, { status: RFQ_STATUS.CANCELLED, cancelReason: reason, cancelledAt: new Date() }, user.id);
    await RfqRepository.logStatus({ rfqId: id, fromStatus: rfq.status, toStatus: RFQ_STATUS.CANCELLED, reason, actorId: user.id });
    await publisher.cancelled(updated, reason, user.id);

    return shape(updated);
  }

  /** DRAFT/SENT->CANCELLED aside, this recomputes SENT->QUOTING->QUOTED as responses arrive. */
  static async recomputeStatus(id, user) {
    const rfq = await RfqRepository.findRawById(id);
    if (!rfq || ![RFQ_STATUS.SENT, RFQ_STATUS.QUOTING].includes(rfq.status)) return;

    const counts = await RfqRepository.countSuppliersByStatus(id);
    const total = counts.reduce((sum, row) => sum + row._count._all, 0);
    const pending = counts.find((row) => row.status === 'PENDING');
    const responded = counts.filter((row) => ['RESPONDED', 'DECLINED'].includes(row.status))
      .reduce((sum, row) => sum + row._count._all, 0);

    let nextStatus = rfq.status;
    if (responded > 0 && responded < total) nextStatus = RFQ_STATUS.QUOTING;
    if (!pending && responded === total) nextStatus = RFQ_STATUS.QUOTED;

    if (nextStatus !== rfq.status) {
      const updated = await RfqRepository.update(id, { status: nextStatus }, user.id);
      await RfqRepository.logStatus({ rfqId: id, fromStatus: rfq.status, toStatus: nextStatus, reason: 'Auto-computed from supplier responses', actorId: user.id });
      if (nextStatus === RFQ_STATUS.QUOTED) await publisher.allQuoted(updated);
    }
  }

  /** SENT/QUOTING/QUOTED -> COMPARED. Purely a workflow checkpoint. */
  static async markCompared(id, user) {
    const rfq = await RfqRepository.findRawById(id);
    if (!rfq) throw ApiError.notFound('RFQ not found');

    assertTransition(rfq.status, RFQ_STATUS.COMPARED);

    const updated = await RfqRepository.update(id, { status: RFQ_STATUS.COMPARED }, user.id);
    await RfqRepository.logStatus({ rfqId: id, fromStatus: rfq.status, toStatus: RFQ_STATUS.COMPARED, actorId: user.id });
    await publisher.compared(updated, user.id);

    return shape(updated);
  }

  static async close(id, user) {
    const rfq = await RfqRepository.findRawById(id);
    if (!rfq) throw ApiError.notFound('RFQ not found');

    assertTransition(rfq.status, RFQ_STATUS.CLOSED);

    const updated = await RfqRepository.update(id, { status: RFQ_STATUS.CLOSED, closedAt: new Date() }, user.id);
    await RfqRepository.logStatus({ rfqId: id, fromStatus: rfq.status, toStatus: RFQ_STATUS.CLOSED, actorId: user.id });
    await publisher.closed(updated, user.id);

    return shape(updated);
  }

  static async stats() {
    const raw = await RfqRepository.stats();
    return { total: raw.totals._count._all, byStatus: raw.byStatus.map((r) => ({ status: r.status, count: r._count._all })) };
  }

  static async scanDeadlines() {
    const overdue = await RfqRepository.dueForDeadlineCheck(new Date());
    if (overdue.length) await publisher.deadlineMissed(overdue);
    return { overdue: overdue.length };
  }

  static shape = shape;
  static shapeLine = shapeLine;
  static assertTransition = assertTransition;
}

module.exports = RfqService;
