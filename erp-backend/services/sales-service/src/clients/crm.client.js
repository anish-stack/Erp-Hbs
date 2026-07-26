'use strict';
const { logger, ApiError } = require('@erp/shared');
const config = require('../config');

async function call(path, { user = null } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.internal.timeoutMs);
  const headers = { 'Content-Type': 'application/json' };
  if (user) {
    headers['x-user-id'] = user.id;
    headers['x-user-email'] = user.email || '';
    headers['x-user-role'] = user.role || '';
    headers['x-user-role-id'] = user.roleId || '';
    headers['x-user-permissions'] = Buffer.from(JSON.stringify(user.permissions || [])).toString('base64');
  }
  try {
    const response = await fetch(`${config.internal.crmServiceUrl}${path}`, { headers, signal: controller.signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(response.status, (payload && payload.message) || 'CRM Service error', { code: 'CRM_SERVICE_ERROR', details: payload });
    }
    return payload ? payload.data : null;
  } catch (err) {
    if (err.name === 'AbortError') throw ApiError.serviceUnavailable('CRM Service timed out');
    throw err;
  } finally { clearTimeout(timer); }
}

class CrmClient {
  static getCustomer(customerId, user) { return call(`${config.basePath}/customers/${customerId}`, { user }); }
  static async healthy() {
    try {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 2000);
      const r = await fetch(`${config.internal.crmServiceUrl}/health/live`, { signal: c.signal });
      clearTimeout(t); return r.ok;
    } catch (err) { logger.warn('CRM health check failed: %s', err.message); return false; }
  }
}
module.exports = CrmClient;
