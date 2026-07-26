'use strict';
const { env } = require('@erp/shared');

module.exports = {
  serviceName: env.str('SERVICE_NAME', 'finance-service'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('FINANCE_SERVICE_PORT', 4013),
  nodeEnv: env.str('NODE_ENV', 'development'),
  basePath: `/api/${env.str('API_VERSION', 'v1')}`,
  bodyLimit: env.str('BODY_LIMIT', '1mb'),
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 10000),
  cacheTtl: env.int('FINANCE_CACHE_TTL', 300),

  sellerStateCode: env.str('SELLER_STATE_CODE', '07'),
  sellerGstin: env.str('SELLER_GSTIN', ''),
  defaultPaymentTermDays: env.int('DEFAULT_PAYMENT_TERM_DAYS', 30),
  autoInvoiceOnSalesConfirm: env.bool('AUTO_INVOICE_ON_SALES_CONFIRM', true),
  autoBillOnGrnComplete: env.bool('AUTO_BILL_ON_GRN_COMPLETE', false),

  internal: {
    salesServiceUrl: env.str('SALES_SERVICE_URL', 'http://127.0.0.1:4012'),
    purchaseServiceUrl: env.str('PURCHASE_SERVICE_URL', 'http://127.0.0.1:4008'),
    timeoutMs: env.int('INTERNAL_TIMEOUT_MS', 5000)
  },

  crons: { overdueScan: env.str('OVERDUE_SCAN_CRON', '0 2 * * *') },

  queue: {
    prefix: env.str('QUEUE_PREFIX', 'erp'),
    concurrency: env.int('QUEUE_CONCURRENCY', 2),
    runInline: env.bool('RUN_WORKERS_INLINE', true),
    attempts: env.int('FINANCE_QUEUE_ATTEMPTS', 3),
    backoffMs: env.int('FINANCE_QUEUE_BACKOFF_MS', 15000)
  }
};
