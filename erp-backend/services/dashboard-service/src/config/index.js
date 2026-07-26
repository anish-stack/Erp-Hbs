'use strict';
const { env } = require('@erp/shared');

module.exports = {
  serviceName: env.str('SERVICE_NAME', 'dashboard-service'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('DASHBOARD_SERVICE_PORT', 4018),
  nodeEnv: env.str('NODE_ENV', 'development'),
  basePath: `/api/${env.str('API_VERSION', 'v1')}`,
  bodyLimit: env.str('BODY_LIMIT', '1mb'),
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 10000),
  widgetCacheTtl: env.int('WIDGET_CACHE_TTL', 60),

  internal: {
    salesServiceUrl: env.str('SALES_SERVICE_URL', 'http://127.0.0.1:4012'),
    purchaseServiceUrl: env.str('PURCHASE_SERVICE_URL', 'http://127.0.0.1:4008'),
    inventoryServiceUrl: env.str('INVENTORY_SERVICE_URL', 'http://127.0.0.1:4009'),
    warehouseServiceUrl: env.str('WAREHOUSE_SERVICE_URL', 'http://127.0.0.1:4010'),
    qualityServiceUrl: env.str('QUALITY_SERVICE_URL', 'http://127.0.0.1:4011'),
    financeServiceUrl: env.str('FINANCE_SERVICE_URL', 'http://127.0.0.1:4013'),
    shipmentServiceUrl: env.str('SHIPMENT_SERVICE_URL', 'http://127.0.0.1:4014'),
    timeoutMs: env.int('INTERNAL_TIMEOUT_MS', 5000)
  }
};
