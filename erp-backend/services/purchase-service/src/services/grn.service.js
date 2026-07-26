'use strict';

const { ApiError, cache } = require('@erp/shared');
const PoRepository = require('../repositories/po.repository');
const GrnRepository = require('../repositories/grn.repository');
const { MasterClient } = require('../clients/master.client');
const publisher = require('../events/publisher');
const config = require('../config');
const { PO_STATUS, GRN_STATUS, INSPECTION_STATUS, CACHE } = require('../constants');

function shapeGrnLine(line) {
  return {
    id: line.id, poLineId: line.poLineId, partId: line.partId, partNumber: line.partNumber,
    orderedQty: line.orderedQty, receivedQty: line.receivedQty, acceptedQty: line.acceptedQty,
    rejectedQty: line.rejectedQty, rejectionReason: line.rejectionReason,
    batchNumber: line.batchNumber, expiryDate: line.expiryDate
  };
}

function shapeGrn(grn) {
  return {
    id: grn.id, code: grn.code, poId: grn.poId, status: grn.status,
    supplierInvoiceNumber: grn.supplierInvoiceNumber, vehicleNumber: grn.vehicleNumber,
    receivedBy: grn.receivedBy, receivedAt: grn.receivedAt,
    inspectionRequired: grn.inspectionRequired, inspectionStatus: grn.inspectionStatus,
    notes: grn.notes,
    lines: grn.lines ? grn.lines.map(shapeGrnLine) : undefined,
    createdAt: grn.createdAt
  };
}

class GrnService {
  /**
   * Records receipt against a PO. Over-receipt beyond GRN_TOLERANCE_PERCENT
   * is rejected outright — this is the control that stops silent quantity
   * creep past what was actually ordered.
   */
  static async create(poId, payload, user) {
    const po = await PoRepository.findById(poId);
    if (!po) throw ApiError.notFound('Purchase order not found');

    if (![PO_STATUS.ISSUED, PO_STATUS.PARTIALLY_RECEIVED].includes(po.status)) {
      throw ApiError.badRequest(`Cannot receive goods while the PO is ${po.status}`);
    }

    const lineMap = new Map(po.lines.map(l => [l.id, l]));
    const tolerance = config.grnTolerancePercent / 100;

    for (const item of payload.lines) {
      const poLine = lineMap.get(item.poLineId);
      if (!poLine) throw ApiError.badRequest('Some GRN lines do not belong to this PO');

      const maxAllowed = poLine.quantity * (1 + tolerance);
      const projectedTotal = poLine.receivedQty + item.receivedQty;
      if (projectedTotal > maxAllowed) {
        throw ApiError.badRequest(
          `Line ${poLine.lineNumber} (${poLine.partNumber}): receiving ${item.receivedQty} would total ${projectedTotal}, exceeding the ${config.grnTolerancePercent}% tolerance over the ordered ${poLine.quantity}`,
          { poLineId: item.poLineId, ordered: poLine.quantity, alreadyReceived: poLine.receivedQty, maxAllowed: Math.floor(maxAllowed) }
        );
      }
    }

    const code = await MasterClient.nextGrnCode(user);
    const inspectionRequired = payload.inspectionRequired !== false;

    const grnLines = payload.lines.map(item => {
      const poLine = lineMap.get(item.poLineId);
      return {
        poLineId: item.poLineId, partId: poLine.partId, partNumber: poLine.partNumber,
        orderedQty: poLine.quantity, receivedQty: item.receivedQty,
        acceptedQty: inspectionRequired ? 0 : item.receivedQty,
        rejectedQty: 0,
        batchNumber: item.batchNumber || null,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null
      };
    });

    const grn = await GrnRepository.create({
      code, poId, status: inspectionRequired ? GRN_STATUS.SUBMITTED : GRN_STATUS.COMPLETED,
      supplierInvoiceNumber: payload.supplierInvoiceNumber || null,
      vehicleNumber: payload.vehicleNumber || null,
      receivedBy: user.id,
      inspectionRequired,
      inspectionStatus: inspectionRequired ? INSPECTION_STATUS.PENDING : INSPECTION_STATUS.NOT_REQUIRED,
      notes: payload.notes || null,
      createdBy: user.id
    }, grnLines);

    // Update PO line receipt counters regardless of inspection outcome (physical receipt is a fact).
    for (const item of payload.lines) {
      const poLine = lineMap.get(item.poLineId);
      await PoRepository.updateLineReceipt(item.poLineId, { receivedQty: poLine.receivedQty + item.receivedQty });
    }

    const refreshedLines = await Promise.all(payload.lines.map(item => PoRepository.findLine(item.poLineId)));
    const allLinesFullyReceived = po.lines.every(line => {
      const refreshed = refreshedLines.find(r => r.id === line.id) || line;
      return refreshed.receivedQty >= refreshed.quantity;
    });

    const newPoStatus = allLinesFullyReceived ? PO_STATUS.RECEIVED : PO_STATUS.PARTIALLY_RECEIVED;
    if (newPoStatus !== po.status) {
      await PoRepository.update(poId, { status: newPoStatus }, user.id);
      await PoRepository.logStatus({ poId, fromStatus: po.status, toStatus: newPoStatus, reason: `GRN ${code} recorded`, actorId: user.id });
    }

    const onTime = !po.expectedDate || new Date() <= new Date(po.expectedDate);
    await publisher.grnCreated(grn, po, onTime, user.id);

    if (inspectionRequired) await publisher.inspectionRequested(grn, user.id);
    else await publisher.grnCompleted(grn, user.id);

    return shapeGrn(grn);
  }

  static async getById(id) {
    const grn = await GrnRepository.findById(id);
    if (!grn) throw ApiError.notFound('GRN not found');
    return shapeGrn(grn);
  }

  static async forPo(poId) {
    const grns = await GrnRepository.forPo(poId);
    return grns.map(shapeGrn);
  }

  /**
   * Called by the Quality Service once inspection is done (or directly by a
   * buyer when inspectionRequired was false and a correction is needed).
   * Updates accepted/rejected quantities and closes the loop back to the PO line.
   */
  static async recordInspectionResult(grnId, results, user) {
    const grn = await GrnRepository.findById(grnId);
    if (!grn) throw ApiError.notFound('GRN not found');

    const lineMap = new Map(grn.lines.map(l => [l.id, l]));
    let anyFailed = false;
    let anyPartial = false;

    for (const result of results) {
      const line = lineMap.get(result.grnLineId);
      if (!line) throw ApiError.badRequest('Some result lines do not belong to this GRN');

      if (result.acceptedQty + result.rejectedQty !== line.receivedQty) {
        throw ApiError.badRequest(
          `Line ${line.partNumber}: accepted (${result.acceptedQty}) + rejected (${result.rejectedQty}) must equal received (${line.receivedQty})`
        );
      }

      await GrnRepository.updateLine(result.grnLineId, {
        acceptedQty: result.acceptedQty, rejectedQty: result.rejectedQty, rejectionReason: result.rejectionReason || null
      });

      if (result.rejectedQty > 0 && result.acceptedQty > 0) anyPartial = true;
      else if (result.rejectedQty > 0) anyFailed = true;
    }

    const inspectionStatus = anyFailed && !anyPartial
      ? INSPECTION_STATUS.FAILED
      : anyPartial || anyFailed
        ? INSPECTION_STATUS.PARTIAL
        : INSPECTION_STATUS.PASSED;

    const updated = await GrnRepository.update(grnId, {
      status: GRN_STATUS.COMPLETED, inspectionStatus
    });

    await publisher.grnCompleted(updated, user.id);
    return shapeGrn(updated);
  }

  static shapeGrn = shapeGrn;
}

module.exports = GrnService;
