'use strict';

/**
 * Builds a Prisma `where` clause from request query params.
 *
 * @param {object} query  req.query
 * @param {object} config {
 *   searchFields: ['name','code'],
 *   filterFields: { status: 'string', isActive: 'boolean', categoryId: 'string' },
 *   dateField: 'createdAt',
 *   softDelete: true
 * }
 */
function buildWhere(query = {}, config = {}) {
  const where = {};
  const and = [];

  if (config.softDelete !== false) where.deletedAt = null;

  const searchFields = config.searchFields || [];
  if (query.search && searchFields.length) {
    and.push({
      OR: searchFields.map((field) => ({
        [field]: { contains: String(query.search).trim() }
      }))
    });
  }

  const filterFields = config.filterFields || {};
  for (const [field, type] of Object.entries(filterFields)) {
    const raw = query[field];
    if (raw === undefined || raw === '') continue;

    if (type === 'boolean') {
      where[field] = ['1', 'true', 'yes'].includes(String(raw).toLowerCase());
    } else if (type === 'number') {
      const num = Number(raw);
      if (!Number.isNaN(num)) where[field] = num;
    } else if (type === 'array') {
      where[field] = { in: String(raw).split(',').map((v) => v.trim()).filter(Boolean) };
    } else {
      where[field] = String(raw);
    }
  }

  const dateField = config.dateField || 'createdAt';
  if (query.dateFrom || query.dateTo) {
    const range = {};
    if (query.dateFrom) {
      const from = new Date(query.dateFrom);
      if (!Number.isNaN(from.valueOf())) range.gte = from;
    }
    if (query.dateTo) {
      const to = new Date(query.dateTo);
      if (!Number.isNaN(to.valueOf())) {
        to.setHours(23, 59, 59, 999);
        range.lte = to;
      }
    }
    if (Object.keys(range).length) where[dateField] = range;
  }

  if (and.length) where.AND = and;
  return where;
}

/** Converts `?fields=id,name,code` into a Prisma select object. */
function buildSelect(fieldsParam, allowedFields = []) {
  if (!fieldsParam) return undefined;
  const requested = String(fieldsParam)
    .split(',')
    .map((f) => f.trim())
    .filter((f) => f && (!allowedFields.length || allowedFields.includes(f)));
  if (!requested.length) return undefined;
  return requested.reduce((acc, field) => ({ ...acc, [field]: true }), {});
}

module.exports = { buildWhere, buildSelect };
