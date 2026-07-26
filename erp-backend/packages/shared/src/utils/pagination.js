'use strict';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Normalises pagination + sorting query params into Prisma-ready values.
 * Query: ?page=1&limit=20&sortBy=createdAt&sortOrder=desc
 */
function buildPagination(query = {}, options = {}) {
  const allowedSort = options.allowedSortFields || null;
  const defaultSort = options.defaultSortField || 'createdAt';
  const defaultOrder = options.defaultSortOrder || 'desc';

  let page = parseInt(query.page, 10);
  if (Number.isNaN(page) || page < 1) page = DEFAULT_PAGE;

  let limit = parseInt(query.limit, 10);
  if (Number.isNaN(limit) || limit < 1) limit = options.defaultLimit || DEFAULT_LIMIT;
  limit = Math.min(limit, options.maxLimit || MAX_LIMIT);

  let sortBy = query.sortBy || defaultSort;
  if (allowedSort && !allowedSort.includes(sortBy)) sortBy = defaultSort;

  const sortOrder = String(query.sortOrder || defaultOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
    sortBy,
    sortOrder
  };
}

function paginatedResult(items, total, { page, limit }) {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}

module.exports = { buildPagination, paginatedResult, DEFAULT_LIMIT, MAX_LIMIT };
