'use strict';

const { logger, ApiError } = require('@erp/shared');
const config = require('../config');

/** Thin internal client for the Master Data Service. Carries caller identity. */
async function call(path, { method = 'GET', body = null, user = null } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.internal.timeoutMs);

  const headers = { 'Content-Type': 'application/json' };
  if (user) {
    headers['x-user-id'] = user.id;
    headers['x-user-email'] = user.email || '';
    headers['x-user-role'] = user.role || '';
    headers['x-user-role-id'] = user.roleId || '';
    headers['x-user-permissions'] = Buffer.from(
      JSON.stringify(user.permissions || [])
    ).toString('base64');
  }

  try {
    const response = await fetch(`${config.internal.masterServiceUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(response.status, (payload && payload.message) || 'Master Data Service error', {
        code: 'MASTER_SERVICE_ERROR',
        details: payload
      });
    }
    return payload ? payload.data : null;
  } catch (err) {
    if (err.name === 'AbortError') throw ApiError.serviceUnavailable('Master Data Service timed out');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

class MasterClient {
  static async getPart(partId, user) {
    return call(`${config.basePath}/master/parts/${partId}`, { user });
  }

  /** Verifies a batch of part ids exist. Returns { found, missing }. */
  static async verifyParts(partIds, user) {
    const unique = [...new Set(partIds)];
    const results = await Promise.allSettled(unique.map((id) => MasterClient.getPart(id, user)));
    const missing = unique.filter((id, i) => results[i].status === 'rejected');
    const found = results.filter((r) => r.status === 'fulfilled').map((r) => r.value).filter(Boolean);
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
      logger.warn('Master Data Service health check failed: %s', err.message);
      return false;
    }
  }
}

module.exports = MasterClient;
