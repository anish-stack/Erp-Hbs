'use strict';

const REPORT_FORMAT = { XLSX: 'XLSX', CSV: 'CSV' };
const RUN_STATUS = { QUEUED: 'QUEUED', RUNNING: 'RUNNING', COMPLETED: 'COMPLETED', FAILED: 'FAILED' };

const QUEUE_NAMES = { REPORT: 'report.generation' };
const JOB_NAMES = { GENERATE: 'generate-report', RETENTION_SCAN: 'report-retention-scan' };

const EVENTS = {
  REPORT_COMPLETED: 'report.completed',
  REPORT_FAILED: 'report.failed'
};

/** Registry of available reports: key -> { name, source, path, columns() }. */
const REPORT_KEYS = {
  SALES_ORDERS: 'sales-orders-register',
  PURCHASE_ORDERS: 'purchase-orders-register',
  INVENTORY_VALUATION: 'inventory-valuation',
  FINANCE_OUTSTANDING: 'finance-outstanding',
  QUALITY_REJECTIONS: 'quality-rejections'
};

const CACHE = { pattern: 'report:*' };

module.exports = {
  REPORT_FORMAT,
  RUN_STATUS,
  QUEUE_NAMES,
  JOB_NAMES,
  EVENTS,
  REPORT_KEYS,
  CACHE
};
