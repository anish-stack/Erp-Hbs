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

async function call(path, { method = 'GET', body = null, user = null } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.internal.timeoutMs);
  try {
    const response = await fetch(`${config.internal.warehouseServiceUrl}${path}`, {
      method, headers: authHeaders(user), body: body ? JSON.stringify(body) : undefined, signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(response.status, (payload && payload.message) || 'Warehouse Service error', { code: 'WAREHOUSE_SERVICE_ERROR', details: payload });
    return payload ? payload.data : null;
  } catch (err) {
    if (err.name === 'AbortError') throw ApiError.serviceUnavailable('Warehouse Service timed out');
    throw err;
  } finally { clearTimeout(timer); }
}

class WarehouseClient {
  /** Creates a PICK task for a shipment line; floor staff work it via the Warehouse service. */
  static createPickTask(payload, user) {
    return call(`${config.basePath}/warehouse/tasks`, { method: 'POST', body: payload, user });
  }
  static async healthy() {
    try {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 2000);
      const r = await fetch(`${config.internal.warehouseServiceUrl}/health/live`, { signal: c.signal });
      clearTimeout(t); return r.ok;
    } catch (err) { logger.warn('Warehouse health check failed: %s', err.message); return false; }
  }
}
module.exports = WarehouseClient;
