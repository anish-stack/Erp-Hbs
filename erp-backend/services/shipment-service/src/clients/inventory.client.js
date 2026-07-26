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
  if (!config.internal.inventoryServiceUrl) throw ApiError.serviceUnavailable('INVENTORY_SERVICE_URL not configured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.internal.timeoutMs);
  try {
    const response = await fetch(`${config.internal.inventoryServiceUrl}${path}`, {
      method, headers: authHeaders(user), body: body ? JSON.stringify(body) : undefined, signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(response.status, (payload && payload.message) || 'Inventory Service error', { code: 'INVENTORY_SERVICE_ERROR', details: payload });
    return payload ? payload.data : null;
  } catch (err) {
    if (err.name === 'AbortError') throw ApiError.serviceUnavailable('Inventory Service timed out');
    throw err;
  } finally { clearTimeout(timer); }
}

class InventoryClient {
  /** Converts an existing reservation into an actual stock issue (reserved -> shipped). */
  static fulfillReservation(reservationId, payload, user) {
    return call(`${config.basePath}/inventory/reservations/${reservationId}/fulfill`, { method: 'POST', body: payload, user });
  }
  /** Direct issue when a line has no reservation (fallback path). */
  static issue(payload, user) {
    return call(`${config.basePath}/inventory/issues`, { method: 'POST', body: payload, user });
  }
  static async healthy() {
    if (!config.internal.inventoryServiceUrl) return true;
    try {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 2000);
      const r = await fetch(`${config.internal.inventoryServiceUrl}/health/live`, { signal: c.signal });
      clearTimeout(t); return r.ok;
    } catch (err) { logger.warn('Inventory health check failed: %s', err.message); return false; }
  }
}
module.exports = InventoryClient;
