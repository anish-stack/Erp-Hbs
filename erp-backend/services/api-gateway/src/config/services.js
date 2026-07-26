'use strict';

const { env } = require('@erp/shared');

/**
 * Service registry. `prefix` is the public path segment under /api/v1.
 * Adding a microservice = adding one entry here.
 */
const SERVICES = [
  { key: 'auth', prefix: '/auth', name: 'Authentication Service', urlEnv: 'AUTH_SERVICE_URL', public: true },
  { key: 'users', prefix: '/users', name: 'User Service', urlEnv: 'USER_SERVICE_URL', multipart: true },
  { key: 'departments', prefix: '/departments', name: 'User Service', urlEnv: 'USER_SERVICE_URL' },
  { key: 'roles', prefix: '/roles', name: 'Role & Permission Service', urlEnv: 'ROLE_SERVICE_URL' },
  { key: 'permissions', prefix: '/permissions', name: 'Role & Permission Service', urlEnv: 'ROLE_SERVICE_URL' },
  { key: 'menus', prefix: '/menus', name: 'Role & Permission Service', urlEnv: 'ROLE_SERVICE_URL' },
  { key: 'master', prefix: '/master', name: 'Master Data Service', urlEnv: 'MASTER_SERVICE_URL' },
  { key: 'suppliers', prefix: '/suppliers', name: 'Supplier Service', urlEnv: 'SUPPLIER_SERVICE_URL' },
  { key: 'rfq', prefix: '/rfq', name: 'RFQ Service', urlEnv: 'RFQ_SERVICE_URL' },
  { key: 'leads', prefix: '/leads', name: 'Customer CRM Service', urlEnv: 'CRM_SERVICE_URL' },
  { key: 'customers', prefix: '/customers', name: 'Customer CRM Service', urlEnv: 'CRM_SERVICE_URL' },
  { key: 'activities', prefix: '/activities', name: 'Customer CRM Service', urlEnv: 'CRM_SERVICE_URL' },
  { key: 'purchase', prefix: '/purchase', name: 'Purchase Service', urlEnv: 'PURCHASE_SERVICE_URL' },
  { key: 'grn', prefix: '/grn', name: 'Purchase Service', urlEnv: 'PURCHASE_SERVICE_URL' },
  { key: 'inventory', prefix: '/inventory', name: 'Inventory Service', urlEnv: 'INVENTORY_SERVICE_URL' },
  { key: 'warehouse', prefix: '/warehouse', name: 'Warehouse Service', urlEnv: 'WAREHOUSE_SERVICE_URL' },
  { key: 'quality', prefix: '/quality', name: 'Quality Inspection Service', urlEnv: 'QUALITY_SERVICE_URL' },
  { key: 'sales', prefix: '/sales', name: 'Sales Service', urlEnv: 'SALES_SERVICE_URL' },
  { key: 'finance', prefix: '/finance', name: 'Finance Service', urlEnv: 'FINANCE_SERVICE_URL' },
  { key: 'shipment', prefix: '/shipment', name: 'Shipment Service', urlEnv: 'SHIPMENT_SERVICE_URL' },
  { key: 'notifications', prefix: '/notifications', name: 'Notification Service', urlEnv: 'NOTIFICATION_SERVICE_URL' },
  { key: 'files', prefix: '/files', name: 'File Service', urlEnv: 'FILE_SERVICE_URL', multipart: true },
  { key: 'reports', prefix: '/reports', name: 'Report Service', urlEnv: 'REPORT_SERVICE_URL' },
  { key: 'dashboard', prefix: '/dashboard', name: 'Dashboard Service', urlEnv: 'DASHBOARD_SERVICE_URL' },
  { key: 'audit', prefix: '/audit', name: 'Audit Service', urlEnv: 'AUDIT_SERVICE_URL' }
];

/** Only services with a configured URL are mounted. */
function getRegistry() {
  return SERVICES.map((service) => ({
    ...service,
    url: env.str(service.urlEnv, '')
  })).filter((service) => Boolean(service.url));
}

/** Unique upstreams (several prefixes can share one service). */
function getUpstreams() {
  const seen = new Map();
  for (const service of getRegistry()) {
    if (!seen.has(service.url)) seen.set(service.url, service);
  }
  return Array.from(seen.values());
}

module.exports = { SERVICES, getRegistry, getUpstreams };
