'use strict';

const NOTIFICATION_CATEGORY = { SALES: 'SALES', PURCHASE: 'PURCHASE', INVENTORY: 'INVENTORY', QUALITY: 'QUALITY', FINANCE: 'FINANCE', SHIPMENT: 'SHIPMENT', SYSTEM: 'SYSTEM' };
const NOTIFICATION_PRIORITY = { LOW: 'LOW', NORMAL: 'NORMAL', HIGH: 'HIGH', CRITICAL: 'CRITICAL' };
const DELIVERY_CHANNEL = { IN_APP: 'IN_APP', EMAIL: 'EMAIL', SMS: 'SMS' };
const DELIVERY_STATUS = { PENDING: 'PENDING', SENT: 'SENT', FAILED: 'FAILED', SKIPPED: 'SKIPPED' };

const QUEUE_NAMES = { NOTIFICATION: 'notification.delivery' };
const JOB_NAMES = { DELIVER: 'deliver-notification', RETENTION_SCAN: 'notification-retention-scan' };

const EVENTS = {
  NOTIFICATION_CREATED: 'notification.created'
};

/**
 * Maps an inbound domain event to a notification template. `patterns` are the
 * RabbitMQ topic bindings this service listens on; `resolve(event)` picks the
 * template for a specific event name at handling time.
 */
const SUBSCRIBED_PATTERNS = [
  'sales.order.*',
  'sales.quotation.*',
  'purchase.order.*',
  'purchase.grn.*',
  'quality.inspection.*',
  'inventory.stock.low',
  'inventory.stock.out',
  'inventory.lot.expiring',
  'finance.invoice.*',
  'finance.payment.*',
  'shipment.*',
  'warehouse.bin.blocked',
  'warehouse.task.assigned',
  'report.completed',
  'report.failed'
];

const CACHE = {
  unreadCount: (userId) => `notification:unread:${userId}`,
  pattern: 'notification:*'
};

module.exports = {
  NOTIFICATION_CATEGORY,
  NOTIFICATION_PRIORITY,
  DELIVERY_CHANNEL,
  DELIVERY_STATUS,
  QUEUE_NAMES,
  JOB_NAMES,
  EVENTS,
  SUBSCRIBED_PATTERNS,
  CACHE
};
