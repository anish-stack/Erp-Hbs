'use strict';
const { logger, ApiError } = require('@erp/shared');
const config = require('../config');

/**
 * Uploads a generated report buffer to the File service as a multipart
 * request, using the platform's native fetch + FormData + Blob (Node 20+).
 * Returns the uploaded file's shape (id, fileName, ...).
 */
async function uploadReport({ buffer, fileName, mimeType, user }) {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType }), fileName);
  form.append('category', 'SPREADSHEET');
  form.append('visibility', 'PRIVATE');

  const headers = {};
  if (user) {
    headers['x-user-id'] = user.id;
    headers['x-user-email'] = user.email || '';
    headers['x-user-role'] = user.role || '';
    headers['x-user-role-id'] = user.roleId || '';
    headers['x-user-permissions'] = Buffer.from(JSON.stringify(user.permissions || [])).toString('base64');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.internal.timeoutMs);
  try {
    const response = await fetch(`${config.internal.fileServiceUrl}${config.basePath}/files/upload`, {
      method: 'POST', headers, body: form, signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(response.status, (payload && payload.message) || 'File Service upload failed', { code: 'FILE_SERVICE_ERROR', details: payload });
    return payload.data;
  } catch (err) {
    if (err.name === 'AbortError') throw ApiError.serviceUnavailable('File Service timed out');
    throw err;
  } finally { clearTimeout(timer); }
}

module.exports = { uploadReport };
