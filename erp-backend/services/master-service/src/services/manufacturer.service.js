'use strict';

const { ApiError, utils } = require('@erp/shared');
const ManufacturerRepository = require('../repositories/manufacturer.repository');
const CacheService = require('./cache.service');
const publisher = require('../events/publisher');
const { CACHE } = require('../constants');

function shape(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    aliases: row.aliases || [],
    country: row.country,
    website: row.website,
    logoFileId: row.logoFileId,
    description: row.description,
    isApproved: row.isApproved,
    isActive: row.isActive,
    partCount: row._count ? row._count.parts : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

class ManufacturerService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['code', 'name', 'createdAt'],
      defaultSortField: 'name',
      defaultSortOrder: 'asc'
    });

    const where = utils.queryBuilder.buildWhere(query, {
      searchFields: ['code', 'name', 'country', 'description'],
      filterFields: { isActive: 'boolean', isApproved: 'boolean', country: 'string' }
    });

    const { items, total } = await ManufacturerRepository.paginate({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy
    });

    return { items: items.map(shape), total, page: pagination.page, limit: pagination.limit };
  }

  static async options() {
    return CacheService.remember(CACHE.manufacturers(), () => ManufacturerRepository.options());
  }

  static async getById(id) {
    const row = await ManufacturerRepository.findById(id);
    if (!row) throw ApiError.notFound('Manufacturer not found');
    return shape(row);
  }

  static async create(payload, actorId) {
    const code = payload.code.trim().toUpperCase();
    if (await ManufacturerRepository.findByCode(code)) {
      throw ApiError.conflict('A manufacturer with this code already exists', { field: 'code' });
    }

    const row = await ManufacturerRepository.create(
      {
        code,
        name: payload.name,
        aliases: payload.aliases || [],
        country: payload.country || null,
        website: payload.website || null,
        logoFileId: payload.logoFileId || null,
        description: payload.description || null,
        isApproved: payload.isApproved !== false,
        isActive: payload.isActive !== false
      },
      actorId
    );

    await CacheService.bust('manufacturer-created', [CACHE.manufacturers()]);
    await publisher.manufacturerCreated(row, actorId);

    return shape(row);
  }

  static async update(id, payload, actorId) {
    const existing = await ManufacturerRepository.findById(id);
    if (!existing) throw ApiError.notFound('Manufacturer not found');

    if (payload.code && payload.code.toUpperCase() !== existing.code) {
      const duplicate = await ManufacturerRepository.findByCode(payload.code.toUpperCase());
      if (duplicate) throw ApiError.conflict('A manufacturer with this code already exists', { field: 'code' });
    }

    const data = { ...payload };
    if (data.code) data.code = data.code.toUpperCase();

    const row = await ManufacturerRepository.update(id, data, actorId);
    await CacheService.bust('manufacturer-updated', [CACHE.manufacturers()]);

    return shape(row);
  }

  static async remove(id, actorId) {
    const existing = await ManufacturerRepository.findById(id);
    if (!existing) throw ApiError.notFound('Manufacturer not found');

    const partCount = await ManufacturerRepository.countParts(id);
    if (partCount > 0) {
      throw ApiError.conflict(
        `${partCount} part(s) belong to this manufacturer. Deactivate it instead of deleting`,
        { partCount }
      );
    }

    await ManufacturerRepository.softDelete(id, actorId);
    await CacheService.bust('manufacturer-deleted', [CACHE.manufacturers()]);

    return { deleted: true };
  }
}

module.exports = ManufacturerService;
