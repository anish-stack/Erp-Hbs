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

async function getJson(baseUrl, path, user) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.internal.timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, { headers: authHeaders(user), signal: controller.signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(response.status, (payload && payload.message) || 'Upstream service error', { code: 'UPSTREAM_SERVICE_ERROR', details: payload });
    return payload;
  } catch (err) {
    if (err.name === 'AbortError') throw ApiError.serviceUnavailable('Upstream service timed out');
    throw err;
  } finally { clearTimeout(timer); }
}

/**
 * Pages through a list endpoint (which all services cap at limit<=100) until
 * it runs out of rows or hits maxPagesPerReport, and returns the flattened
 * array. Report generation always wants "all matching rows", not one page.
 */
async function fetchAllPages(baseUrl, path, query, user) {
  const rows = [];
  const separator = path.includes('?') ? '&' : '?';
  for (let page = 1; page <= config.maxPagesPerReport; page++) {
    const qs = new URLSearchParams({ ...query, page: String(page), limit: '100' }).toString();
    const payload = await getJson(baseUrl, `${path}${separator}${qs}`, user);
    const data = payload ? payload.data : null;
    const items = data && Array.isArray(data.items) ? data.items : [];
    rows.push(...items);
    const total = data ? data.total : items.length;
    if (items.length < 100 || rows.length >= total) break;
  }
  return rows;
}

function healthCheckFor(baseUrl) {
  return async () => {
    try {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 2000);
      const r = await fetch(`${baseUrl}/health/live`, { signal: c.signal });
      clearTimeout(t); return r.ok;
    } catch (err) { logger.warn('Health check failed for %s: %s', baseUrl, err.message); return false; }
  };
}

module.exports = {
  fetchAllPages,
  getJson,
  urls: config.internal,
  healthy: {
    sales: healthCheckFor(config.internal.salesServiceUrl),
    purchase: healthCheckFor(config.internal.purchaseServiceUrl),
    inventory: healthCheckFor(config.internal.inventoryServiceUrl),
    finance: healthCheckFor(config.internal.financeServiceUrl),
    quality: healthCheckFor(config.internal.qualityServiceUrl),
    file: healthCheckFor(config.internal.fileServiceUrl)
  }
};
