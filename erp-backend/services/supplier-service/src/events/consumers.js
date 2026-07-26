'use strict';

const { broker, logger } = require('@erp/shared');
const RatingService = require('../services/rating.service');

const QUEUE = 'supplier-service.events';

/**
 * Purchase and quality outcomes feed the vendor scorecard counters, so the
 * next evaluation is based on measured facts rather than opinion.
 */
async function handle(event) {
  const data = event.data || {};
  const supplierId = data.supplierId;
  if (!supplierId) return;

  switch (event.event) {
    case 'purchase.order.created':
      await RatingService.recordEvent(supplierId, { ordersPlaced: 1 }, new Date());
      break;

    case 'purchase.grn.created':
      await RatingService.recordEvent(supplierId, {
        lotsReceived: 1,
        ...(data.onTime === false ? { ordersLate: 1 } : { ordersOnTime: 1 })
      });
      break;

    case 'quality.inspection.passed':
      await RatingService.recordEvent(supplierId, { lotsAccepted: 1 });
      break;

    case 'quality.inspection.failed':
      await RatingService.recordEvent(supplierId, { lotsRejected: 1 });
      break;

    case 'rfq.created':
      await RatingService.recordEvent(supplierId, { quotesRequested: 1 });
      break;

    case 'rfq.quoted':
      await RatingService.recordEvent(supplierId, { quotesAnswered: 1 });
      break;

    default:
      return;
  }

  logger.info('Supplier %s performance updated from %s', supplierId, event.event);
}

async function registerConsumers() {
  await broker.subscribe(
    QUEUE,
    ['purchase.order.created', 'purchase.grn.created', 'quality.inspection.*', 'rfq.created', 'rfq.quoted'],
    handle
  );

  logger.info('Supplier consumers registered on queue %s', QUEUE);
}

module.exports = { registerConsumers, QUEUE, handle };
