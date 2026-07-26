'use strict';

const { logger, ApiError } = require('@erp/shared');
const config = require('../config');

async function call(baseUrl, path, { method = 'GET', body = null, user = null } = {}) {
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
    const response = await fetch(`${baseUrl}${path}`, {
      method, headers, body: body ? JSON.stringify(body) : undefined, signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(response.status, (payload && payload.message) || 'Upstream service error', {
        code: 'UPSTREAM_SERVICE_ERROR', details: payload
      });
    }
    return payload ? payload.data : null;
  } catch (err) {
    if (err.name === 'AbortError') throw ApiError.serviceUnavailable(`${baseUrl} timed out`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

class MasterClient {
  static async nextRfqCode(user) {
    const result = await call(config.internal.masterServiceUrl, `${config.basePath}/master/sequences/RFQ/next`, { method: 'POST', body: { count: 1 }, user });
    return result.first;
  }

  static async getPart(partId, user) {
    return call(config.internal.masterServiceUrl, `${config.basePath}/master/parts/${partId}`, { user });
  }

  static async verifyParts(partIds, user) {
    const unique = [...new Set(partIds)];
    const results = await Promise.allSettled(unique.map((id) => MasterClient.getPart(id, user)));
    const missing = unique.filter((id, index) => results[index].status === 'rejected');
    const found = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    return { found, missing };
  }

  static async healthy() {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`${config.internal.masterServiceUrl}/health/live`, { signal: controller.signal });
      clearTimeout(timer);
      return response.ok;
    } catch (err) {
      return false;
    }
  }
}

module.exports = { MasterClient, call };
