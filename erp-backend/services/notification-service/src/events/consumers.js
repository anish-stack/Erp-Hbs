'use strict';
const { broker, logger } = require('@erp/shared');
const NotificationService = require('../services/notification.service');
const templates = require('../services/template.service');
const { SUBSCRIBED_PATTERNS } = require('../constants');

const QUEUE = 'notification-service.events';

/**
 * Single fan-in handler for every subscribed domain event. Resolves a
 * template (category/priority/title/message/channels), figures out the
 * recipient (specific user if the event names one, otherwise a role or a
 * broadcast), and dispatches. Unmapped events still get a generic system
 * notice via template.service's fallback so nothing silently disappears.
 */
async function handle(event) {
  const data = event.data || {};
  const tmpl = templates.resolve(event.event, data);

  const recipientId = data.assignedTo || data.inspectorId || data.requestedBy || null;
  const audienceRole = !recipientId ? roleFor(event.event) : null;

  await NotificationService.dispatch({
    recipientId,
    audienceRole,
    type: event.event,
    category: tmpl.category,
    priority: tmpl.priority,
    title: tmpl.title,
    message: tmpl.message,
    data,
    channels: tmpl.channels,
    sourceEvent: event.event,
    sourceId: data.orderId || data.poId || data.grnId || data.inspectionId || data.invoiceId || data.shipmentId || data.paymentId || null
  });
}

/** Best-effort role targeting when an event carries no specific user. */
function roleFor(eventName) {
  if (eventName.startsWith('sales.')) return 'sales';
  if (eventName.startsWith('purchase.')) return 'purchase';
  if (eventName.startsWith('quality.')) return 'quality';
  if (eventName.startsWith('inventory.') || eventName.startsWith('warehouse.')) return 'warehouse';
  if (eventName.startsWith('finance.')) return 'finance';
  if (eventName.startsWith('shipment.')) return 'shipment';
  return null;
}

async function registerConsumers() {
  await broker.subscribe(QUEUE, SUBSCRIBED_PATTERNS, handle);
  logger.info('Notification consumers registered on queue %s (patterns: %s)', QUEUE, SUBSCRIBED_PATTERNS.join(', '));
}

module.exports = { registerConsumers, QUEUE, handle };
