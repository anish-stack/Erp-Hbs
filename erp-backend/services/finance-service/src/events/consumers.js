'use strict';
const { broker, logger } = require('@erp/shared');
const InvoiceService = require('../services/invoice.service');
const config = require('../config');

const QUEUE = 'finance-service.events';

/**
 * Finance drafts invoices off upstream milestones:
 *  - sales.order.confirmed  -> draft SALES (AR) invoice from the sales order
 *  - purchase.grn.completed -> draft PURCHASE (AP) bill from the PO (optional)
 * Both are idempotent on (sourceType, sourceId, type).
 */
async function handle(event) {
  const data = event.data || {};
  try {
    if (event.event === 'sales.order.confirmed' && config.autoInvoiceOnSalesConfirm && data.orderId) {
      await InvoiceService.draftFromSalesOrder(data.orderId, event.actor || null);
      logger.info('Drafted AR invoice for sales order %s', data.code || data.orderId);
    } else if (event.event === 'purchase.grn.completed' && config.autoBillOnGrnComplete && data.poId) {
      await InvoiceService.draftFromPurchaseOrder(data.poId, event.actor || null, { sourceType: 'GRN', sourceId: data.grnId, sourceCode: data.code });
      logger.info('Drafted AP bill for PO %s (GRN %s)', data.poId, data.code || data.grnId);
    }
  } catch (err) {
    logger.error('Finance consumer failed [%s]: %s', event.event, err.message);
  }
}

async function registerConsumers() {
  await broker.subscribe(QUEUE, ['sales.order.confirmed', 'purchase.grn.completed'], handle);
  logger.info('Finance consumers registered on queue %s', QUEUE);
}

module.exports = { registerConsumers, QUEUE, handle };
