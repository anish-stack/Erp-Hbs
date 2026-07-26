'use strict';

const { ApiError } = require('@erp/shared');
const RfqRepository = require('../repositories/rfq.repository');
const QuoteRepository = require('../repositories/quote.repository');
const RfqService = require('./rfq.service');
const publisher = require('../events/publisher');
const { RFQ_STATUS } = require('../constants');

class AwardService {
  /**
   * Awards specific quoted lines to specific suppliers. Splitting one RFQ
   * across multiple suppliers per line is fully supported — each award
   * entry targets exactly one rfqLineId.
   */
  static async award(rfqId, awards, user) {
    const rfq = await RfqRepository.findById(rfqId);
    if (!rfq) throw ApiError.notFound('RFQ not found');

    RfqService.assertTransition(rfq.status, RFQ_STATUS.AWARDED);

    const lineIds = new Set(rfq.lines.map((l) => l.id));
    for (const award of awards) {
      if (!lineIds.has(award.rfqLineId)) {
        throw ApiError.badRequest(`Line ${award.rfqLineId} does not belong to this RFQ`);
      }
    }

    const quoteLines = await QuoteRepository.linesForRfq(rfqId);
    const updated = [];

    for (const award of awards) {
      const match = quoteLines.find(
        (ql) => ql.rfqLineId === award.rfqLineId && ql.quote.rfqSupplier.supplierId === award.supplierId
      );
      if (!match) {
        throw ApiError.badRequest('No matching quote found for this line and supplier combination', {
          rfqLineId: award.rfqLineId, supplierId: award.supplierId
        });
      }

      const line = await RfqRepository.awardLine(award.rfqLineId, {
        awardedSupplierId: award.supplierId,
        awardedQty: award.quantity ?? match.quotedQty,
        awardedPrice: match.unitPrice
      });
      updated.push(line);
    }

    const rfqUpdated = await RfqRepository.update(rfqId, { status: RFQ_STATUS.AWARDED, awardedAt: new Date() }, user.id);
    await RfqRepository.logStatus({ rfqId, fromStatus: rfq.status, toStatus: RFQ_STATUS.AWARDED, actorId: user.id });
    await publisher.awarded(rfqUpdated, updated, user.id);

    return {
      rfqId,
      status: RFQ_STATUS.AWARDED,
      awards: updated.map((line) => RfqService.shapeLine(line))
    };
  }
}

module.exports = AwardService;
