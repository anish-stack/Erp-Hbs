'use strict';

/** Widget key -> which roles see it by default. 'admin' sees everything. */
const WIDGET_KEYS = {
  SALES_SUMMARY: 'sales-summary',
  PURCHASE_SUMMARY: 'purchase-summary',
  INVENTORY_HEALTH: 'inventory-health',
  QUALITY_HEALTH: 'quality-health',
  FINANCE_OUTSTANDING: 'finance-outstanding',
  SHIPMENT_PIPELINE: 'shipment-pipeline'
};

const ROLE_WIDGETS = {
  admin: Object.values(WIDGET_KEYS),
  owner: Object.values(WIDGET_KEYS),
  sales: [WIDGET_KEYS.SALES_SUMMARY, WIDGET_KEYS.SHIPMENT_PIPELINE, WIDGET_KEYS.FINANCE_OUTSTANDING],
  purchase: [WIDGET_KEYS.PURCHASE_SUMMARY, WIDGET_KEYS.QUALITY_HEALTH, WIDGET_KEYS.FINANCE_OUTSTANDING],
  warehouse: [WIDGET_KEYS.INVENTORY_HEALTH, WIDGET_KEYS.SHIPMENT_PIPELINE, WIDGET_KEYS.QUALITY_HEALTH],
  finance: [WIDGET_KEYS.FINANCE_OUTSTANDING, WIDGET_KEYS.SALES_SUMMARY, WIDGET_KEYS.PURCHASE_SUMMARY],
  quality: [WIDGET_KEYS.QUALITY_HEALTH, WIDGET_KEYS.INVENTORY_HEALTH]
};

const CACHE = {
  widget: (key) => `dashboard:widget:${key}`,
  layout: (userId) => `dashboard:layout:${userId}`,
  pattern: 'dashboard:*'
};

module.exports = { WIDGET_KEYS, ROLE_WIDGETS, CACHE };
