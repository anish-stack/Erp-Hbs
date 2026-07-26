'use strict';

const { ApiError, utils, cache } = require('@erp/shared');
const BinRepository = require('../repositories/bin.repository');
const ZoneRepository = require('../repositories/zone.repository');
const WarehouseService = require('./warehouse.service');
const publisher = require('../events/publisher');
const { BIN_STATUS, CACHE } = require('../constants');

function shape(b) {
  return {
    id: b.id,
    warehouseId: b.warehouseId,
    zoneId: b.zoneId,
    code: b.code,
    aisle: b.aisle,
    rack: b.rack,
    shelf: b.shelf,
    level: b.level,
    binType: b.binType,
    status: b.status,
    maxUnits: b.maxUnits,
    maxWeightKg: b.maxWeightKg !== null && b.maxWeightKg !== undefined ? String(b.maxWeightKg) : null,
    currentUnits: b.currentUnits,
    occupancyPct: b.maxUnits ? Math.round((b.currentUnits / b.maxUnits) * 100) : null,
    isPickable: b.isPickable,
    isBulk: b.isBulk,
    mslZone: b.mslZone,
    notes: b.notes,
    createdAt: b.createdAt
  };
}

function pad(n, width) {
  return String(n).padStart(width, '0');
}

class BinService {
  static async list(warehouseId, query) {
    await WarehouseService.assertExists(warehouseId);
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['code', 'currentUnits', 'createdAt'],
      defaultSortField: 'code',
      defaultSortOrder: 'asc'
    });
    const where = {
      warehouseId,
      ...(query.zoneId ? { zoneId: query.zoneId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.binType ? { binType: query.binType } : {}),
      ...(query.isPickable !== undefined ? { isPickable: query.isPickable } : {}),
      ...(query.search ? { code: { contains: query.search } } : {})
    };
    const { items, total } = await BinRepository.paginate({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy
    });
    return { items: items.map(shape), total, page: pagination.page, limit: pagination.limit };
  }

  static async getById(id) {
    const bin = await BinRepository.findById(id);
    if (!bin) throw ApiError.notFound('Bin not found');
    return shape(bin);
  }

  static async assertZone(warehouseId, zoneId) {
    if (!zoneId) return;
    const zone = await ZoneRepository.findById(zoneId);
    if (!zone || zone.warehouseId !== warehouseId) {
      throw ApiError.badRequest('Zone does not belong to this warehouse');
    }
  }

  static async create(warehouseId, payload) {
    await WarehouseService.assertExists(warehouseId);
    await BinService.assertZone(warehouseId, payload.zoneId);

    const code = payload.code.toUpperCase();
    if (await BinRepository.findByCode(warehouseId, code)) {
      throw ApiError.conflict('A bin with this code already exists in the warehouse', { field: 'code' });
    }

    const bin = await BinRepository.create({
      warehouseId,
      zoneId: payload.zoneId || null,
      code,
      aisle: payload.aisle || null,
      rack: payload.rack || null,
      shelf: payload.shelf || null,
      level: payload.level || null,
      binType: payload.binType || 'SHELF',
      status: payload.status || 'AVAILABLE',
      maxUnits: payload.maxUnits ?? null,
      maxWeightKg: payload.maxWeightKg ?? null,
      isPickable: payload.isPickable ?? true,
      isBulk: payload.isBulk || false,
      mslZone: payload.mslZone || false,
      notes: payload.notes || null
    });

    await cache.del(CACHE.bins(warehouseId));
    return shape(bin);
  }

  /** Generates a grid of bins from aisle/rack/shelf ranges, e.g. A-01-1..A-04-3. */
  static async bulkCreate(warehouseId, payload) {
    await WarehouseService.assertExists(warehouseId);
    await BinService.assertZone(warehouseId, payload.zoneId);

    const rows = [];
    const { prefix = '', aisles = [], racks = 1, shelves = 1, levels = 1 } = payload;
    const aisleList = Array.isArray(aisles) && aisles.length ? aisles : ['A'];

    for (const aisle of aisleList) {
      for (let r = 1; r <= racks; r += 1) {
        for (let s = 1; s <= shelves; s += 1) {
          for (let l = 1; l <= levels; l += 1) {
            const parts = [aisle, pad(r, 2), pad(s, 1)];
            if (levels > 1) parts.push(pad(l, 1));
            const code = `${prefix}${parts.join('-')}`.toUpperCase();
            rows.push({
              warehouseId,
              zoneId: payload.zoneId || null,
              code,
              aisle: String(aisle),
              rack: pad(r, 2),
              shelf: pad(s, 1),
              level: levels > 1 ? pad(l, 1) : null,
              binType: payload.binType || 'SHELF',
              status: 'AVAILABLE',
              maxUnits: payload.maxUnits ?? null,
              isPickable: payload.isPickable ?? true,
              mslZone: payload.mslZone || false
            });
          }
        }
      }
    }

    if (rows.length > 2000) throw ApiError.badRequest('Bulk create is limited to 2000 bins per call', { requested: rows.length });

    const result = await BinRepository.createMany(rows);
    await cache.del(CACHE.bins(warehouseId));
    return { requested: rows.length, created: result.count };
  }

  static async update(id, payload) {
    const bin = await BinRepository.findById(id);
    if (!bin) throw ApiError.notFound('Bin not found');
    if (payload.zoneId) await BinService.assertZone(bin.warehouseId, payload.zoneId);

    const data = { ...payload };
    delete data.code;
    delete data.currentUnits;
    const updated = await BinRepository.update(id, data);
    await cache.del(CACHE.bins(bin.warehouseId));
    return shape(updated);
  }

  static async setStatus(id, status, reason) {
    const bin = await BinRepository.findById(id);
    if (!bin) throw ApiError.notFound('Bin not found');
    if (status === BIN_STATUS.BLOCKED && bin.currentUnits > 0) {
      throw ApiError.conflict('Cannot block a bin that still holds stock', { currentUnits: bin.currentUnits });
    }
    const updated = await BinRepository.update(id, { status, notes: reason || bin.notes });
    await cache.del(CACHE.bins(bin.warehouseId));
    if (status === BIN_STATUS.BLOCKED) await publisher.binBlocked(updated, reason);
    return shape(updated);
  }

  static async remove(id) {
    const bin = await BinRepository.findById(id);
    if (!bin) throw ApiError.notFound('Bin not found');
    if (bin.currentUnits > 0) throw ApiError.conflict('Cannot delete a bin that still holds stock');
    await BinRepository.remove(id);
    await cache.del(CACHE.bins(bin.warehouseId));
    return { deleted: true };
  }

  static async suggest(warehouseId, { zoneId = null, mslZone = null, needUnits = 0 } = {}) {
    const bin = await BinRepository.findAvailable(warehouseId, { zoneId, mslZone, needUnits });
    return bin ? shape(bin) : null;
  }

  static shape = shape;
}

module.exports = BinService;
