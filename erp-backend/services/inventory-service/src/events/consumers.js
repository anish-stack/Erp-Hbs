'use strict';

const { broker, logger } = require('@erp/shared');
const ReservationService = require('../services/reservation.service');
const { REF_TYPE } = require('../constants');

const QUEUE = 'inventory-service.events';

/**
 * Inventory reacts to upstream lifecycle events. It never fabricates stock from
 * events that lack line detail; canonical stock-in/out flows through the REST
 * API (POST /inventory/receipts, /issues) which downstream services call with
 * full line data. Here we only handle reservation lifecycle side effects.
 */
async function handle(event) {
  const data = event.data || {};

  switch (event.event) {
    // A sales order was cancelled or lost: free any stock we were holding.
    case 'sales.order.cancelled':
    case 'sales.order.lost':
      if (data.orderId || data.salesOrderId) {
        const refId = data.orderId || data.salesOrderId;
        const result = await ReservationService.releaseByRef(REF_TYPE.SALES_ORDER, refId, event.actor);
        logger.info('Released %d reservation(s) for cancelled SO %s', result.released, refId);
      }
      break;

    // A shipment fully dispatched against an order: reservations are consumed
    // by the sales/shipment flow via the fulfil API, so nothing to do here
    // beyond an informational log.
    case 'shipment.dispatched':
      logger.info('Shipment %s dispatched (inventory already issued via fulfil)', data.shipmentId || '-');
      break;

    default:
      return;
  }
}

async function registerConsumers() {
  await broker.subscribe(QUEUE, ['sales.order.cancelled', 'sales.order.lost', 'shipment.dispatched'], handle);
  logger.info('Inventory consumers registered on queue %s', QUEUE);
}

module.exports = { registerConsumers, QUEUE, handle };
