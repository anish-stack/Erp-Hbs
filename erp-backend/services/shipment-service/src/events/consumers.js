'use strict';
const { broker, logger } = require('@erp/shared');
const ShipmentService = require('../services/shipment.service');
const config = require('../config');

const QUEUE = 'shipment-service.events';

/**
 * A confirmed sales order is ready to ship. We create a PENDING shipment
 * mirroring the order's lines and reservations, then (optionally) raise
 * warehouse PICK tasks. The event already carries warehouseId + totals.
 */
async function handle(event) {
  const data = event.data || {};
  if (event.event === 'sales.order.confirmed' && config.autoCreateOnOrderConfirm && data.orderId) {
    await ShipmentService.createFromOrder(data.orderId, event.actor || null).catch((err) =>
      logger.error('Auto shipment creation failed for order %s: %s', data.orderId, err.message)
    );
    logger.info('Shipment auto-created for order %s', data.code || data.orderId);
  }
}

async function registerConsumers() {
  await broker.subscribe(QUEUE, ['sales.order.confirmed'], handle);
  logger.info('Shipment consumers registered on queue %s', QUEUE);
}

module.exports = { registerConsumers, QUEUE, handle };
