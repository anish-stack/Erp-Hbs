'use strict';
const { broker, logger } = require('@erp/shared');
const OrderService = require('../services/order.service');

const QUEUE = 'sales-service.events';

/**
 * Shipment dispatch updates the shipped quantities on the order lines so the
 * order can progress to PARTIALLY_FULFILLED / FULFILLED. The event carries the
 * order id and shipped lines.
 */
async function handle(event) {
  const data = event.data || {};
  if (event.event === 'shipment.dispatched' && (data.orderId || data.salesOrderId)) {
    const orderId = data.orderId || data.salesOrderId;
    const lines = Array.isArray(data.lines) ? data.lines : [];
    await OrderService.applyShipment(orderId, lines, event.actor).catch((err) =>
      logger.error('applyShipment failed for order %s: %s', orderId, err.message)
    );
    logger.info('Applied shipment to order %s (%d line[s])', orderId, lines.length);
  }
}

async function registerConsumers() {
  await broker.subscribe(QUEUE, ['shipment.dispatched'], handle);
  logger.info('Sales consumers registered on queue %s', QUEUE);
}

module.exports = { registerConsumers, QUEUE, handle };
