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

class SalesClient {
  static async getOrder(orderId, user) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.internal.timeoutMs);
    try {
      const response = await fetch(`${config.internal.salesServiceUrl}${config.basePath}/sales/orders/${orderId}`, {
        headers: authHeaders(user), signal: controller.signal
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new ApiError(response.status, (payload && payload.message) || 'Sales Service error', { code: 'SALES_SERVICE_ERROR', details: payload });
      return payload ? payload.data : null;
    } catch (err) {
      if (err.name === 'AbortError') throw ApiError.serviceUnavailable('Sales Service timed out');
      throw err;
    } finally { clearTimeout(timer); }
  }

  static async healthy() {
    try {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 2000);
      const r = await fetch(`${config.internal.salesServiceUrl}/health/live`, { signal: c.signal });
      clearTimeout(t); return r.ok;
    } catch (err) { logger.warn('Sales health check failed: %s', err.message); return false; }
  }
}
module.exports = SalesClient;
