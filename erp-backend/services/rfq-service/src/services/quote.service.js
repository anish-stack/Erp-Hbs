'use strict';

const { ApiError } = require('@erp/shared');
const RfqRepository = require('../repositories/rfq.repository');
const QuoteRepository = require('../repositories/quote.repository');
const RfqService = require('./rfq.service');
const publisher = require('../events/publisher');
const { RFQ_STATUS, RFQ_SUPPLIER_STATUS } = require('../constants');

function decimal(v) { return v === null || v === undefined ? null : String(v); }

function shapeQuote(quote) {
  return {
    id: quote.id,
    rfqId: quote.rfqId,
    supplierId: quote.supplierId,
    currencyCode: quote.currencyCode,
    validTill: quote.validTill,
    paymentTermDays: quote.paymentTermDays,
    incoterm: quote.incoterm,
    notes: quote.notes,
    submittedAt: quote.submittedAt,
    lines: quote.lines.map((line) => ({
      id: line.id,
      rfqLineId: line.rfqLineId,
      unitPrice: decimal(line.unitPrice),
      moq: line.moq,
      quotedQty: line.quotedQty,
      leadTimeDays: line.leadTimeDays,
      discountPercent: decimal(line.discountPercent),
      netUnitPrice: Number((Number(line.unitPrice) * (1 - Number(line.discountPercent || 0) / 100)).toFixed(4)),
      alternatePartId: line.alternatePartId,
      alternateNotes: line.alternateNotes,
      notes: line.notes
    }))
  };
}

class QuoteService {
  /** Records a supplier's response and pushes the RFQ status forward. */
  static async submit(rfqId, supplierId, payload, user) {
    const rfq = await RfqRepository.findById(rfqId);
    if (!rfq) throw ApiError.notFound('RFQ not found');

    if (![RFQ_STATUS.SENT, RFQ_STATUS.QUOTING].includes(rfq.status)) {
      throw ApiError.badRequest(`Quotes cannot be submitted while the RFQ is ${rfq.status}`);
    }

    const rfqSupplier = rfq.suppliers.find((s) => s.supplierId === supplierId);
    if (!rfqSupplier) throw ApiError.badRequest('This supplier was not invited to the RFQ');
    if (rfqSupplier.quote) throw ApiError.conflict('This supplier has already submitted a quote');

    const lineIds = new Set(rfq.lines.map((l) => l.id));
    const missingLines = payload.lines.filter((l) => !lineIds.has(l.rfqLineId));
    if (missingLines.length) throw ApiError.badRequest('Some quoted lines do not belong to this RFQ');

    const quote = await QuoteRepository.create(
      {
        rfqId,
        rfqSupplierId: rfqSupplier.id,
        supplierId,
        currencyCode: payload.currencyCode || rfq.currencyCode,
        validTill: payload.validTill ? new Date(payload.validTill) : null,
        paymentTermDays: payload.paymentTermDays ?? null,
        incoterm: payload.incoterm || null,
        notes: payload.notes || null,
        submittedBy: user.id
      },
      payload.lines.map((line) => ({
        rfqLineId: line.rfqLineId,
        unitPrice: line.unitPrice,
        moq: line.moq ?? 1,
        quotedQty: line.quotedQty,
        leadTimeDays: line.leadTimeDays ?? null,
        discountPercent: line.discountPercent ?? 0,
        alternatePartId: line.alternatePartId || null,
        alternateNotes: line.alternateNotes || null,
        notes: line.notes || null
      }))
    );

    await RfqRepository.updateRfqSupplier(rfqSupplier.id, { status: RFQ_SUPPLIER_STATUS.RESPONDED, respondedAt: new Date() });
    await publisher.quoted(rfq, supplierId, user.id);
    await RfqService.recomputeStatus(rfqId, user);

    return shapeQuote(quote);
  }

  static async decline(rfqId, supplierId, reason, user) {
    const rfq = await RfqRepository.findRawById(rfqId);
    if (!rfq) throw ApiError.notFound('RFQ not found');

    const rfqSupplier = await RfqRepository.findRfqSupplier(rfqId, supplierId);
    if (!rfqSupplier) throw ApiError.badRequest('This supplier was not invited to the RFQ');

    await RfqRepository.updateRfqSupplier(rfqSupplier.id, {
      status: RFQ_SUPPLIER_STATUS.DECLINED, respondedAt: new Date(), declinedReason: reason
    });

    await RfqService.recomputeStatus(rfqId, user);
    return { declined: true };
  }

  /**
   * Comparison sheet: for every RFQ line, every supplier's quote side by side,
   * cheapest highlighted. This is the sourcing decision surface.
   */
  static async compareSheet(rfqId) {
    const rfq = await RfqRepository.findById(rfqId);
    if (!rfq) throw ApiError.notFound('RFQ not found');

    const allLines = await QuoteRepository.linesForRfq(rfqId);

    const byRfqLine = new Map();
    for (const line of rfq.lines) {
      byRfqLine.set(line.id, {
        rfqLineId: line.id,
        lineNumber: line.lineNumber,
        partNumber: line.partNumber,
        description: line.description,
        quantity: line.quantity,
        targetPrice: decimal(line.targetPrice),
        awardedSupplierId: line.awardedSupplierId,
        quotes: []
      });
    }

    for (const quoteLine of allLines) {
      const bucket = byRfqLine.get(quoteLine.rfqLineId);
      if (!bucket) continue;

      const net = Number(quoteLine.unitPrice) * (1 - Number(quoteLine.discountPercent || 0) / 100);
      bucket.quotes.push({
        supplierId: quoteLine.quote.rfqSupplier.supplierId,
        supplierCode: quoteLine.quote.rfqSupplier.supplierCode,
        supplierName: quoteLine.quote.rfqSupplier.supplierName,
        unitPrice: decimal(quoteLine.unitPrice),
        netUnitPrice: Number(net.toFixed(4)),
        extendedPrice: Number((net * quoteLine.quotedQty).toFixed(2)),
        moq: quoteLine.moq,
        quotedQty: quoteLine.quotedQty,
        leadTimeDays: quoteLine.leadTimeDays,
        isAlternate: Boolean(quoteLine.alternatePartId)
      });
    }

    const lines = Array.from(byRfqLine.values()).map((line) => {
      line.quotes.sort((a, b) => a.netUnitPrice - b.netUnitPrice);
      line.cheapestSupplierId = line.quotes.length ? line.quotes[0].supplierId : null;
      line.fastestSupplierId = line.quotes.filter((q) => q.leadTimeDays !== null)
        .reduce((best, q) => (!best || q.leadTimeDays < best.leadTimeDays ? q : best), null);
      line.fastestSupplierId = line.fastestSupplierId ? line.fastestSupplierId.supplierId : null;
      return line;
    });

    return { rfqId, code: rfq.code, status: rfq.status, lines };
  }

  static shapeQuote = shapeQuote;
}

module.exports = QuoteService;
