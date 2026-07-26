'use strict';
const { logger } = require('@erp/shared');
const config = require('../config');

function authHeaders(user) {
  const headers = { 'Content-Type': 'application/json' };
  if (user) {
    headers['x-user-id'] = user.id;
    headers['x-user-email'] = user.email || '';
    headers['x-user-role'] = user.role || '';
    headers['x-user-role-id'] = user.roleId || '';
    headers['x-user-permissions'] = Buffer.from(JSON.stringify(user.permissions || [])).toString('base64');
  }
  return headers;
}

/** Fetches a /stats-style endpoint; returns null on any failure so a widget
 *  can degrade gracefully instead of breaking the whole dashboard response. */
async function safeGet(baseUrl, path, user) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.internal.timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, { headers: authHeaders(user), signal: controller.signal });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    return payload ? payload.data : null;
  } catch (err) {
    logger.warn('Widget data fetch failed [%s%s]: %s', baseUrl, path, err.message);
    return null;
  } finally { clearTimeout(timer); }
}

function healthCheckFor(baseUrl) {
  return async () => {
    try {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 2000);
      const r = await fetch(`${baseUrl}/health/live`, { signal: c.signal });
      clearTimeout(t); return r.ok;
    } catch (err) { return false; }
  };
}

module.exports = {
  safeGet,
  urls: config.internal,
  healthy: {
    sales: healthCheckFor(config.internal.salesServiceUrl),
    purchase: healthCheckFor(config.internal.purchaseServiceUrl),
    inventory: healthCheckFor(config.internal.inventoryServiceUrl),
    warehouse: healthCheckFor(config.internal.warehouseServiceUrl),
    quality: healthCheckFor(config.internal.qualityServiceUrl),
    finance: healthCheckFor(config.internal.financeServiceUrl),
    shipment: healthCheckFor(config.internal.shipmentServiceUrl)
  }
};
