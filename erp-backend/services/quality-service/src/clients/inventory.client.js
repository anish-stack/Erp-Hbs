'use strict';

const { logger, ApiError } = require('@erp/shared');
const config = require('../config');

async function call(path, { method = 'GET', body = null, user = null } = {}) {
  if (!config.internal.inventoryServiceUrl) throw ApiError.serviceUnavailable('INVENTORY_SERVICE_URL not configured');
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
    const response = await fetch(`${config.internal.inventoryServiceUrl}${path}`, {
      method, headers, body: body ? JSON.stringify(body) : undefined, signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(response.status, (payload && payload.message) || 'Inventory Service error', {
        code: 'INVENTORY_SERVICE_ERROR', details: payload
      });
    }
    return payload ? payload.data : null;
  } catch (err) {
    if (err.name === 'AbortError') throw ApiError.serviceUnavailable('Inventory Service timed out');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

class InventoryClient {
  /** Post accepted goods into available stock after a passed inspection. */
  static async postReceipt(payload, user) {
    return call(`${config.basePath}/inventory/receipts`, { method: 'POST', body: payload, user });
  }

  static async healthy() {
    if (!config.internal.inventoryServiceUrl) return true;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`${config.internal.inventoryServiceUrl}/health/live`, { signal: controller.signal });
      clearTimeout(timer);
      return response.ok;
    } catch (err) {
      logger.warn('Inventory health check failed: %s', err.message);
      return false;
    }
  }
}

module.exports = InventoryClient;
