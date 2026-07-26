'use strict';
const { logger, ApiError } = require('@erp/shared');
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

async function get(baseUrl, path, user, label) {
  if (!baseUrl) throw ApiError.serviceUnavailable(`${label} service URL not configured`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.internal.timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, { headers: authHeaders(user), signal: controller.signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(response.status, (payload && payload.message) || `${label} service error`, { code: `${label.toUpperCase()}_SERVICE_ERROR`, details: payload });
    return payload ? payload.data : null;
  } catch (err) {
    if (err.name === 'AbortError') throw ApiError.serviceUnavailable(`${label} service timed out`);
    throw err;
  } finally { clearTimeout(timer); }
}

async function live(baseUrl) {
  if (!baseUrl) return true;
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 2000);
    const r = await fetch(`${baseUrl}/health/live`, { signal: c.signal });
    clearTimeout(t); return r.ok;
  } catch (err) { logger.warn('Health check failed: %s', err.message); return false; }
}

class SalesClient {
  static getOrder(orderId, user) { return get(config.internal.salesServiceUrl, `${config.basePath}/sales/orders/${orderId}`, user, 'Sales'); }
  static healthy() { return live(config.internal.salesServiceUrl); }
}

class PurchaseClient {
  static getOrder(poId, user) { return get(config.internal.purchaseServiceUrl, `${config.basePath}/purchase/${poId}`, user, 'Purchase'); }
  static getGrn(grnId, user) { return get(config.internal.purchaseServiceUrl, `${config.basePath}/grn/${grnId}`, user, 'Purchase'); }
  static healthy() { return live(config.internal.purchaseServiceUrl); }
}

module.exports = { SalesClient, PurchaseClient };
