'use strict';

const { ApiError, utils, cache } = require('@erp/shared');
const PartRepository = require('../repositories/part.repository');
const ManufacturerRepository = require('../repositories/manufacturer.repository');
const CategoryRepository = require('../repositories/category.repository');
const LookupRepository = require('../repositories/lookup.repository');
const publisher = require('../events/publisher');
const partNumber = require('../utils/partNumber');
const { CACHE, LIFECYCLE } = require('../constants');
const config = require('../config');

const RISKY_LIFECYCLES = [LIFECYCLE.OBSOLETE, LIFECYCLE.END_OF_LIFE];

function decimal(value) {
  return value === null || value === undefined ? null : String(value);
}

function shape(part) {
  return {
    id: part.id,
    partNumber: part.partNumber,
    normalizedNumber: part.normalizedNumber,
    internalCode: part.internalCode,
    description: part.description,
    longDescription: part.longDescription,
    manufacturer: part.manufacturer,
    category: part.category,
    uom: part.uom,
    taxRate: part.taxRate
      ? { ...part.taxRate, ratePercent: decimal(part.taxRate.ratePercent) }
      : null,
    currency: part.currency,
    packageType: part.packageType,
    mountingType: part.mountingType,
    lifecycle: part.lifecycle,
    lifecycleRisk: RISKY_LIFECYCLES.includes(part.lifecycle),
    rohsCompliant: part.rohsCompliant,
    reachCompliant: part.reachCompliant,
    countryOfOrigin: part.countryOfOrigin,
    hsnCode: part.hsnCode,
    specifications: part.specifications || null,
    datasheetFileId: part.datasheetFileId,
    imageFileId: part.imageFileId,
    moq: part.moq,
    packQuantity: part.packQuantity,
    leadTimeDays: part.leadTimeDays,
    minStock: part.minStock,
    maxStock: part.maxStock,
    reorderPoint: part.reorderPoint,
    shelfLifeDays: part.shelfLifeDays,
    standardCost: decimal(part.standardCost),
    lastPurchasePrice: decimal(part.lastPurchasePrice),
    listPrice: decimal(part.listPrice),
    isActive: part.isActive,
    isSerialised: part.isSerialised,
    isBatchTracked: part.isBatchTracked,
    alternates: part.alternatesFrom
      ? part.alternatesFrom.map((link) => ({
          id: link.alternate.id,
          partNumber: link.alternate.partNumber,
          description: link.alternate.description,
          lifecycle: link.alternate.lifecycle,
          type: link.type,
          notes: link.notes
        }))
      : undefined,
    createdAt: part.createdAt,
    updatedAt: part.updatedAt
  };
}

async function resolveReferences(payload, { partial = false } = {}) {
  const checks = [];

  if (payload.manufacturerId) {
    checks.push(
      ManufacturerRepository.findById(payload.manufacturerId).then((row) => {
        if (!row) throw ApiError.badRequest('Manufacturer not found', { field: 'manufacturerId' });
      })
    );
  } else if (!partial) {
    throw ApiError.badRequest('manufacturerId is required');
  }

  if (payload.categoryId) {
    checks.push(
      CategoryRepository.findById(payload.categoryId).then((row) => {
        if (!row) throw ApiError.badRequest('Category not found', { field: 'categoryId' });
      })
    );
  }

  if (payload.uomId) {
    checks.push(
      LookupRepository.uomById(payload.uomId).then((row) => {
        if (!row) throw ApiError.badRequest('Unit of measure not found', { field: 'uomId' });
      })
    );
  }

  if (payload.taxRateId) {
    checks.push(
      LookupRepository.taxRateById(payload.taxRateId).then((row) => {
        if (!row) throw ApiError.badRequest('Tax rate not found', { field: 'taxRateId' });
      })
    );
  }

  if (payload.currencyId) {
    checks.push(
      LookupRepository.currencyById(payload.currencyId).then((row) => {
        if (!row) throw ApiError.badRequest('Currency not found', { field: 'currencyId' });
      })
    );
  }

  await Promise.all(checks);
}

class PartService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['partNumber', 'createdAt', 'updatedAt', 'lifecycle'],
      defaultSortField: 'createdAt'
    });

    const where = {
      deletedAt: null,
      ...(query.manufacturerId ? { manufacturerId: query.manufacturerId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.lifecycle ? { lifecycle: query.lifecycle } : {}),
      ...(query.mountingType ? { mountingType: query.mountingType } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.rohsCompliant !== undefined ? { rohsCompliant: query.rohsCompliant } : {}),
      ...(query.hsnCode ? { hsnCode: query.hsnCode } : {})
    };

    if (query.categoryPath) {
      where.category = {
        OR: [{ path: query.categoryPath }, { path: { startsWith: `${query.categoryPath}/` } }]
      };
    }

    if (query.search) {
      const normalized = partNumber.normalize(query.search);
      where.OR = [
        { normalizedNumber: { contains: normalized } },
        { partNumber: { contains: query.search } },
        { description: { contains: query.search } },
        { internalCode: { contains: query.search } }
      ];
    }

    const { items, total } = await PartRepository.paginate({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy
    });

    return { items: items.map(shape), total, page: pagination.page, limit: pagination.limit };
  }

  /**
   * Buyer-facing lookup. Tries the exact normalised MPN, then a prefix match,
   * then a fuzzy contains match, reporting which tier produced the hits.
   */
  static async search(term, options = {}) {
    if (!term || term.trim().length < 2) {
      throw ApiError.badRequest('Search term must be at least 2 characters');
    }

    const variants = partNumber.searchVariants(term);
    const result = await PartRepository.search(variants, {
      limit: options.limit || config.partSearchLimit,
      categoryPath: options.categoryPath || null
    });

    return {
      term,
      normalized: variants[0],
      variantsTried: variants,
      matchType: result.matchType,
      count: result.matches.length,
      matches: result.matches.map(shape)
    };
  }

  static async getById(id) {
    const cached = await cache.get(CACHE.part(id));
    if (cached) return cached;

    const part = await PartRepository.findById(id);
    if (!part) throw ApiError.notFound('Part not found');

    const shaped = shape(part);
    await cache.set(CACHE.part(id), shaped, config.cacheTtl);
    return shaped;
  }

  static async create(payload, actorId) {
    await resolveReferences(payload);

    const normalized = partNumber.normalize(payload.partNumber);
    if (!normalized) throw ApiError.badRequest('Part number is invalid');

    const duplicate = await PartRepository.findByMpn(payload.manufacturerId, normalized);
    if (duplicate) {
      throw ApiError.conflict('This manufacturer already has a part with the same number', {
        field: 'partNumber',
        existingPartId: duplicate.id
      });
    }

    const part = await PartRepository.create(
      {
        partNumber: payload.partNumber.trim(),
        normalizedNumber: normalized,
        internalCode: payload.internalCode || null,
        manufacturerId: payload.manufacturerId,
        categoryId: payload.categoryId,
        uomId: payload.uomId,
        taxRateId: payload.taxRateId || null,
        currencyId: payload.currencyId || null,
        description: payload.description,
        longDescription: payload.longDescription || null,
        packageType: payload.packageType || null,
        mountingType: payload.mountingType || 'UNKNOWN',
        lifecycle: payload.lifecycle || LIFECYCLE.ACTIVE,
        rohsCompliant: payload.rohsCompliant !== false,
        reachCompliant: payload.reachCompliant !== false,
        countryOfOrigin: payload.countryOfOrigin || null,
        hsnCode: payload.hsnCode || null,
        specifications: payload.specifications || null,
        datasheetFileId: payload.datasheetFileId || null,
        imageFileId: payload.imageFileId || null,
        moq: payload.moq ?? 1,
        packQuantity: payload.packQuantity ?? 1,
        leadTimeDays: payload.leadTimeDays ?? null,
        minStock: payload.minStock ?? 0,
        maxStock: payload.maxStock ?? null,
        reorderPoint: payload.reorderPoint ?? 0,
        shelfLifeDays: payload.shelfLifeDays ?? null,
        standardCost: payload.standardCost ?? null,
        listPrice: payload.listPrice ?? null,
        isActive: payload.isActive !== false,
        isSerialised: payload.isSerialised === true,
        isBatchTracked: payload.isBatchTracked === true
      },
      actorId
    );

    await publisher.partCreated(part, actorId);
    return shape(part);
  }

  static async update(id, payload, actorId) {
    const existing = await PartRepository.findById(id);
    if (!existing) throw ApiError.notFound('Part not found');

    await resolveReferences(payload, { partial: true });

    const data = { ...payload };

    if (payload.partNumber) {
      const normalized = partNumber.normalize(payload.partNumber);
      const manufacturerId = payload.manufacturerId || existing.manufacturerId;
      const duplicate = await PartRepository.findByMpn(manufacturerId, normalized);

      if (duplicate && duplicate.id !== id) {
        throw ApiError.conflict('This manufacturer already has a part with the same number', {
          field: 'partNumber'
        });
      }

      data.partNumber = payload.partNumber.trim();
      data.normalizedNumber = normalized;
    }

    const part = await PartRepository.update(id, data, actorId);
    await cache.del(CACHE.part(id));

    if (payload.lifecycle && payload.lifecycle !== existing.lifecycle) {
      await publisher.partLifecycleChanged(part, existing.lifecycle, actorId);
    }
    await publisher.partUpdated(part, Object.keys(data), actorId);

    return shape(part);
  }

  static async remove(id, actorId) {
    const existing = await PartRepository.findById(id);
    if (!existing) throw ApiError.notFound('Part not found');

    await PartRepository.softDelete(id, actorId);
    await cache.del(CACHE.part(id));
    await publisher.partDeleted(existing, actorId);

    return { deleted: true };
  }

  /** Alternates are stored both ways so either part surfaces the other. */
  static async addAlternate(partId, payload, actorId) {
    if (partId === payload.alternateId) {
      throw ApiError.badRequest('A part cannot be its own alternate');
    }

    const [part, alternate] = await Promise.all([
      PartRepository.findById(partId),
      PartRepository.findById(payload.alternateId)
    ]);

    if (!part) throw ApiError.notFound('Part not found');
    if (!alternate) throw ApiError.badRequest('Alternate part not found', { field: 'alternateId' });

    const existing = part.alternatesFrom.find((link) => link.alternateId === payload.alternateId);
    if (existing) throw ApiError.conflict('This alternate is already linked');

    await PartRepository.addAlternate({
      partId,
      alternateId: payload.alternateId,
      type: payload.type || 'FUNCTIONAL',
      notes: payload.notes || null,
      createdBy: actorId
    });

    if (payload.bidirectional !== false) {
      await PartRepository.addAlternate({
        partId: payload.alternateId,
        alternateId: partId,
        type: payload.type || 'FUNCTIONAL',
        notes: payload.notes || null,
        createdBy: actorId
      }).catch(() => {});
    }

    await cache.del(CACHE.part(partId), CACHE.part(payload.alternateId));
    return PartService.getById(partId);
  }

  static async removeAlternate(partId, alternateId) {
    await PartRepository.removeAlternate(partId, alternateId);
    await PartRepository.removeAlternate(alternateId, partId);
    await cache.del(CACHE.part(partId), CACHE.part(alternateId));
    return { removed: true };
  }

  static async stats() {
    const raw = await PartRepository.stats();

    const categories = await CategoryRepository.all({ includeInactive: true });
    const byId = new Map(categories.map((category) => [category.id, category]));

    return {
      total: raw.totals._count._all,
      byLifecycle: raw.byLifecycle.map((row) => ({
        lifecycle: row.lifecycle,
        count: row._count._all
      })),
      topCategories: raw.byCategory.map((row) => ({
        categoryId: row.categoryId,
        category: byId.get(row.categoryId)
          ? { code: byId.get(row.categoryId).code, name: byId.get(row.categoryId).name }
          : null,
        count: row._count._all
      }))
    };
  }

  static shape = shape;
}

module.exports = PartService;
