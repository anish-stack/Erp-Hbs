'use strict';

const { ApiError, utils } = require('@erp/shared');
const CategoryRepository = require('../repositories/category.repository');
const CacheService = require('./cache.service');
const publisher = require('../events/publisher');
const { buildTree, buildPath } = require('../utils/categoryTree');
const { CACHE } = require('../constants');

const MAX_DEPTH = 5;

function shape(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    parentId: row.parentId,
    path: row.path,
    level: row.level,
    sortOrder: row.sortOrder,
    iconKey: row.iconKey,
    isActive: row.isActive,
    partCount: row._count ? row._count.parts : undefined,
    childCount: row._count ? row._count.children : undefined,
    createdAt: row.createdAt
  };
}

class CategoryService {
  static async tree() {
    return CacheService.remember(CACHE.categoryTree(), async () => {
      const rows = await CategoryRepository.all({ includeInactive: false });
      return buildTree(rows);
    });
  }

  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['code', 'name', 'level', 'sortOrder', 'createdAt'],
      defaultSortField: 'path',
      defaultSortOrder: 'asc'
    });

    const where = utils.queryBuilder.buildWhere(query, {
      searchFields: ['code', 'name', 'description', 'path'],
      filterFields: { isActive: 'boolean', parentId: 'string', level: 'number' }
    });

    const { items, total } = await CategoryRepository.paginate({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.sortBy === 'path' ? { path: pagination.sortOrder } : pagination.orderBy
    });

    return { items: items.map(shape), total, page: pagination.page, limit: pagination.limit };
  }

  static async getById(id) {
    const row = await CategoryRepository.findById(id);
    if (!row) throw ApiError.notFound('Category not found');
    return shape(row);
  }

  static async create(payload, actorId) {
    const code = payload.code.trim().toUpperCase();
    if (await CategoryRepository.findByCode(code)) {
      throw ApiError.conflict('A category with this code already exists', { field: 'code' });
    }

    let parent = null;
    if (payload.parentId) {
      parent = await CategoryRepository.findById(payload.parentId);
      if (!parent) throw ApiError.badRequest('Parent category not found', { field: 'parentId' });
      if (parent.level + 1 >= MAX_DEPTH) {
        throw ApiError.badRequest(`Category depth is limited to ${MAX_DEPTH} levels`);
      }
    }

    const row = await CategoryRepository.create(
      {
        code,
        name: payload.name,
        description: payload.description || null,
        parentId: parent ? parent.id : null,
        path: buildPath(parent ? parent.path : null, code),
        level: parent ? parent.level + 1 : 0,
        sortOrder: payload.sortOrder ?? 0,
        iconKey: payload.iconKey || null,
        isActive: payload.isActive !== false
      },
      actorId
    );

    await CacheService.bust('category-created', [CACHE.categoryTree()]);
    return shape(row);
  }

  /** Re-parenting rewrites the materialised path of every descendant. */
  static async update(id, payload, actorId) {
    const existing = await CategoryRepository.findById(id);
    if (!existing) throw ApiError.notFound('Category not found');

    const data = { ...payload };
    if (data.code) data.code = data.code.toUpperCase();

    let repath = null;

    if (payload.parentId !== undefined && payload.parentId !== existing.parentId) {
      if (payload.parentId === id) throw ApiError.badRequest('A category cannot be its own parent');

      let parent = null;
      if (payload.parentId) {
        parent = await CategoryRepository.findById(payload.parentId);
        if (!parent) throw ApiError.badRequest('Parent category not found', { field: 'parentId' });

        if (parent.path === existing.path || parent.path.startsWith(`${existing.path}/`)) {
          throw ApiError.badRequest('Cannot move a category into its own subtree');
        }
        if (parent.level + 1 >= MAX_DEPTH) {
          throw ApiError.badRequest(`Category depth is limited to ${MAX_DEPTH} levels`);
        }
      }

      const newLevel = parent ? parent.level + 1 : 0;
      const newPath = buildPath(parent ? parent.path : null, data.code || existing.code);

      repath = { oldPath: existing.path, newPath, levelDelta: newLevel - existing.level };
      data.path = newPath;
      data.level = newLevel;
    } else if (data.code && data.code !== existing.code) {
      const segments = existing.path.split('/');
      segments[segments.length - 1] = data.code;
      const newPath = segments.join('/');
      repath = { oldPath: existing.path, newPath, levelDelta: 0 };
      data.path = newPath;
    }

    const row = await CategoryRepository.update(id, data, actorId);

    if (repath) {
      await CategoryRepository.repath(repath.oldPath, repath.newPath, repath.levelDelta);
    }

    await CacheService.bust('category-updated', [CACHE.categoryTree()]);
    await publisher.categoryUpdated(row, Object.keys(data), actorId);

    return shape(row);
  }

  static async remove(id, actorId) {
    const existing = await CategoryRepository.findById(id);
    if (!existing) throw ApiError.notFound('Category not found');

    const [partCount, childCount] = await Promise.all([
      CategoryRepository.countParts(id),
      CategoryRepository.countChildren(id)
    ]);

    if (partCount > 0) {
      throw ApiError.conflict(`${partCount} part(s) use this category`, { partCount });
    }
    if (childCount > 0) {
      throw ApiError.conflict(`Category has ${childCount} subcategory(ies)`, { childCount });
    }

    await CategoryRepository.softDelete(id, actorId);
    await CacheService.bust('category-deleted', [CACHE.categoryTree()]);

    return { deleted: true };
  }
}

module.exports = CategoryService;
