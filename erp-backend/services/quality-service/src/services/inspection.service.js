'use strict';
const { ApiError, utils, cache } = require('@erp/shared');
const InspectionRepository = require('../repositories/inspection.repository');
const PlanRepository = require('../repositories/plan.repository');
const MasterClient = require('../clients/master.client');
const InventoryClient = require('../clients/inventory.client');
const publisher = require('../events/publisher');
const {
  INSPECTION_STATUS, STATUS_TRANSITIONS, DISPOSITION, RESULT_FLAG, REF_TYPE, CACHE
} = require('../constants');
const config = require('../config');

function dec(v) { return v === null || v === undefined ? null : String(v); }

function shape(i) {
  if (!i) return null;
  return {
    id: i.id, code: i.code, type: i.type, status: i.status,
    grnId: i.grnId, grnCode: i.grnCode, poId: i.poId, supplierId: i.supplierId,
    partId: i.partId, partCode: i.partCode, partName: i.partName,
    lotId: i.lotId, lotNumber: i.lotNumber, warehouseId: i.warehouseId, planId: i.planId,
    receivedQty: dec(i.receivedQty), sampleSize: dec(i.sampleSize), inspectedQty: dec(i.inspectedQty),
    acceptedQty: dec(i.acceptedQty), rejectedQty: dec(i.rejectedQty), unitCost: dec(i.unitCost),
    disposition: i.disposition, inspectorId: i.inspectorId, remarks: i.remarks,
    results: i.results ? i.results.map((r) => ({
      id: r.id, parameter: r.parameter, specification: r.specification, method: r.method,
      observed: r.observed, result: r.result, defectType: r.defectType, severity: r.severity,
      qtyDefective: dec(r.qtyDefective), note: r.note
    })) : undefined,
    resultCount: i._count ? i._count.results : undefined,
    refType: i.refType, refId: i.refId,
    startedAt: i.startedAt, completedAt: i.completedAt, createdAt: i.createdAt, updatedAt: i.updatedAt
  };
}

function assertTransition(from, to) {
  const allowed = STATUS_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) throw ApiError.conflict(`Illegal inspection status change ${from} -> ${to}`);
}

async function nextCode() {
  const year = new Date().getFullYear();
  const n = await InspectionRepository.countYear(year).catch(() => 0);
  return `QC-${year}-${String(n + 1).padStart(5, '0')}`;
}

class InspectionService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['createdAt', 'code', 'completedAt'], defaultSortField: 'createdAt'
    });
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.partId ? { partId: query.partId } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.grnId ? { grnId: query.grnId } : {}),
      ...(query.pending ? { status: { in: ['PENDING', 'IN_PROGRESS', 'ON_HOLD'] } } : {}),
      ...(query.search ? { OR: [{ code: { contains: query.search } }, { partCode: { contains: query.search } }, { grnCode: { contains: query.search } }] } : {})
    };
    const { items, total } = await InspectionRepository.paginate({ where, skip: pagination.skip, take: pagination.take, orderBy: pagination.orderBy });
    return { items: items.map(shape), total, page: pagination.page, limit: pagination.limit };
  }

  static async getById(id) {
    const i = await InspectionRepository.findById(id);
    if (!i) throw ApiError.notFound('Inspection not found');
    return shape(i);
  }

  static async create(payload, user) {
    const part = await MasterClient.getPart(payload.partId, user).catch(() => null);
    if (!part) throw ApiError.badRequest('Part not found in master data', { partId: payload.partId });

    if (payload.grnId) {
      const dup = await InspectionRepository.findByGrn(payload.grnId, payload.partId);
      if (dup) throw ApiError.conflict('An inspection already exists for this GRN and part', { existing: dup.code });
    }

    let planId = payload.planId || null;
    let sampleSize = payload.sampleSize ?? 0;
    if (!planId) {
      const plan = await PlanRepository.matchForPart(payload.partId, payload.categoryId || null);
      if (plan) {
        planId = plan.id;
        if (!payload.sampleSize) sampleSize = plan.sampleSize ?? Math.ceil(Number(payload.receivedQty) * 0.1);
      }
    }

    const i = await InspectionRepository.create({
      code: await nextCode(),
      type: payload.type || 'INCOMING',
      status: INSPECTION_STATUS.PENDING,
      grnId: payload.grnId || null,
      grnCode: payload.grnCode || null,
      poId: payload.poId || null,
      supplierId: payload.supplierId || null,
      partId: payload.partId,
      partCode: part.code || part.partNumber || payload.partCode || null,
      partName: part.name || null,
      lotId: payload.lotId || null,
      lotNumber: payload.lotNumber || null,
      warehouseId: payload.warehouseId || null,
      planId,
      receivedQty: payload.receivedQty,
      sampleSize,
      unitCost: payload.unitCost ?? 0,
      remarks: payload.remarks || null,
      refType: payload.refType || (payload.grnId ? REF_TYPE.GRN : REF_TYPE.MANUAL),
      refId: payload.refId || payload.grnId || null,
      createdBy: user.id,
      updatedBy: user.id
    });

    await publisher.created(i, user.id);
    return shape(i);
  }

  static async start(id, user) {
    const i = await InspectionRepository.findById(id, { detailed: false });
    if (!i) throw ApiError.notFound('Inspection not found');
    assertTransition(i.status, INSPECTION_STATUS.IN_PROGRESS);
    const updated = await InspectionRepository.update(id, {
      status: INSPECTION_STATUS.IN_PROGRESS, startedAt: new Date(), inspectorId: user.id, updatedBy: user.id
    });
    await publisher.started(updated, user.id);
    return shape(updated);
  }

  static async setResults(id, results, user) {
    const i = await InspectionRepository.findById(id, { detailed: false });
    if (!i) throw ApiError.notFound('Inspection not found');
    if (![INSPECTION_STATUS.IN_PROGRESS, INSPECTION_STATUS.PENDING].includes(i.status)) {
      throw ApiError.conflict('Results can only be recorded before completion');
    }
    await InspectionRepository.clearResults(id);
    await InspectionRepository.addResults(results.map((r) => ({
      inspectionId: id,
      parameter: r.parameter,
      specification: r.specification || null,
      method: r.method || null,
      observed: r.observed || null,
      result: r.result || RESULT_FLAG.PASS,
      defectType: r.defectType || null,
      severity: r.severity || null,
      qtyDefective: r.qtyDefective || 0,
      note: r.note || null
    })));
    await InspectionRepository.update(id, { updatedBy: user.id });
    return InspectionService.getById(id);
  }

  /**
   * Completes an inspection. acceptedQty is posted to Inventory as available
   * stock (when disposition is ACCEPT/USE_AS_IS and auto-receipt is on).
   * Rejected qty is recorded for return/scrap handling downstream.
   */
  static async complete(id, payload, user) {
    const i = await InspectionRepository.findById(id, { detailed: false });
    if (!i) throw ApiError.notFound('Inspection not found');
    if (i.status !== INSPECTION_STATUS.IN_PROGRESS) throw ApiError.conflict('Start the inspection before completing it');

    const received = Number(i.receivedQty);
    const accepted = payload.acceptedQty !== undefined ? Number(payload.acceptedQty) : received;
    const rejected = payload.rejectedQty !== undefined ? Number(payload.rejectedQty) : received - accepted;

    if (accepted < 0 || rejected < 0 || accepted + rejected > received + 1e-6) {
      throw ApiError.badRequest('accepted + rejected cannot exceed received quantity', { received });
    }

    const disposition = payload.disposition || (rejected === 0 ? DISPOSITION.ACCEPT : accepted === 0 ? DISPOSITION.REJECT : DISPOSITION.ACCEPT);
    const status = rejected === 0 ? INSPECTION_STATUS.PASSED : accepted === 0 ? INSPECTION_STATUS.FAILED : INSPECTION_STATUS.PARTIAL;

    // Post accepted stock into Inventory (available) before marking done.
    const shouldReceive =
      config.autoReceiptOnAccept &&
      accepted > 0 &&
      [DISPOSITION.ACCEPT, DISPOSITION.USE_AS_IS].includes(disposition) &&
      i.warehouseId;

    if (shouldReceive) {
      try {
        await InventoryClient.postReceipt({
          partId: i.partId,
          warehouseId: i.warehouseId,
          quantity: accepted,
          unitCost: Number(i.unitCost) || 0,
          lotNumber: i.lotNumber || `QC-${i.code}`,
          supplierId: i.supplierId || null,
          refType: 'GRN',
          refId: i.grnId || i.id,
          refCode: i.grnCode || i.code,
          reason: `Accepted after inspection ${i.code}`
        }, user);
      } catch (err) {
        throw ApiError.serviceUnavailable(`Failed to post accepted stock to Inventory: ${err.message}`);
      }
    }

    const updated = await InspectionRepository.update(id, {
      status,
      disposition,
      acceptedQty: accepted,
      rejectedQty: rejected,
      inspectedQty: accepted + rejected,
      remarks: payload.remarks ?? i.remarks,
      completedAt: new Date(),
      updatedBy: user.id
    });

    await cache.del(CACHE.inspection(id));
    if (status === INSPECTION_STATUS.PASSED) await publisher.passed(updated, user.id);
    else if (status === INSPECTION_STATUS.FAILED) await publisher.failed(updated, user.id);
    else await publisher.partial(updated, user.id);

    return shape(updated);
  }

  static async hold(id, reason, user) {
    const i = await InspectionRepository.findById(id, { detailed: false });
    if (!i) throw ApiError.notFound('Inspection not found');
    assertTransition(i.status, INSPECTION_STATUS.ON_HOLD);
    const updated = await InspectionRepository.update(id, { status: INSPECTION_STATUS.ON_HOLD, remarks: reason || i.remarks, updatedBy: user.id });
    return shape(updated);
  }

  static async cancel(id, reason, user) {
    const i = await InspectionRepository.findById(id, { detailed: false });
    if (!i) throw ApiError.notFound('Inspection not found');
    assertTransition(i.status, INSPECTION_STATUS.CANCELLED);
    const updated = await InspectionRepository.update(id, { status: INSPECTION_STATUS.CANCELLED, remarks: reason || i.remarks, updatedBy: user.id });
    return shape(updated);
  }

  static async stats() {
    const raw = await InspectionRepository.stats();
    const acc = Number(raw.totals._sum.acceptedQty || 0);
    const rej = Number(raw.totals._sum.rejectedQty || 0);
    const total = acc + rej;
    return {
      byStatus: raw.byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      byDisposition: raw.byDisposition.map((r) => ({ disposition: r.disposition, count: r._count._all })),
      quantities: { received: dec(raw.totals._sum.receivedQty || 0), accepted: dec(acc), rejected: dec(rej) },
      rejectionRatePct: total > 0 ? Math.round((rej / total) * 10000) / 100 : 0
    };
  }

  static async sweepStale(before) {
    const stale = await InspectionRepository.staleOpen(before);
    return { stale: stale.length };
  }

  static shape = shape;
}
module.exports = InspectionService;
