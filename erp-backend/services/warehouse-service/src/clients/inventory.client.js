'use strict';

const { logger, ApiError } = require('@erp/shared');
const config = require('../config');

/** Internal client for the Inventory service. Used to move stock between bins
 *  when a putaway or move task completes. Best-effort: if Inventory is down the
 *  task still records, but the caller decides whether to hard-fail. */
async function call(path, { method = 'GET', body = null, user = null } = {}) {
  if (!config.internal.inventoryServiceUrl) {
    throw ApiError.serviceUnavailable('INVENTORY_SERVICE_URL is not configured');
  }
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
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(response.status, (payload && payload.message) || 'Inventory Service error', {
        code: 'INVENTORY_SERVICE_ERROR',
        details: payload
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
  /** Move stock from one bin to another within a warehouse. */
  static async transferBin({ partId, warehouseId, fromBin, toBin, quantity, refCode }, user) {
    return call(`${config.basePath}/inventory/transfers`, {
      method: 'POST',
      body: {
        partId,
        fromWarehouseId: warehouseId,
        toWarehouseId: warehouseId,
        fromBin,
        toBin,
        quantity,
        refCode,
        reason: 'Warehouse putaway/move'
      },
      user
    });
  }

  static async healthy() {
    if (!config.internal.inventoryServiceUrl) return true; // optional dependency
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`${config.internal.inventoryServiceUrl}/health/live`, { signal: controller.signal });
      clearTimeout(timer);
      return response.ok;
    } catch (err) {
      logger.warn('Inventory Service health check failed: %s', err.message);
      return false;
    }
  }
}

module.exports = InventoryClient;
