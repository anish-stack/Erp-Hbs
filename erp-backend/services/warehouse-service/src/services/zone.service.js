'use strict';

const { ApiError, cache } = require('@erp/shared');
const ZoneRepository = require('../repositories/zone.repository');
const WarehouseService = require('./warehouse.service');
const { CACHE } = require('../constants');

function shape(z) {
  return {
    id: z.id,
    warehouseId: z.warehouseId,
    code: z.code,
    name: z.name,
    type: z.type,
    temperatureControlled: z.temperatureControlled,
    esdProtected: z.esdProtected,
    isActive: z.isActive,
    binCount: z._count ? z._count.bins : undefined,
    createdAt: z.createdAt
  };
}

class ZoneService {
  static async list(warehouseId) {
    await WarehouseService.assertExists(warehouseId);
    const zones = await ZoneRepository.listByWarehouse(warehouseId);
    return zones.map(shape);
  }

  static async create(warehouseId, payload) {
    await WarehouseService.assertExists(warehouseId);
    const code = payload.code.toUpperCase();
    if (await ZoneRepository.findByCode(warehouseId, code)) {
      throw ApiError.conflict('A zone with this code already exists in the warehouse', { field: 'code' });
    }
    const zone = await ZoneRepository.create({
      warehouseId,
      code,
      name: payload.name,
      type: payload.type || 'STORAGE',
      temperatureControlled: payload.temperatureControlled || false,
      esdProtected: payload.esdProtected || false,
      isActive: payload.isActive ?? true
    });
    await cache.del(CACHE.warehouse(warehouseId));
    return shape(zone);
  }

  static async update(zoneId, payload) {
    const zone = await ZoneRepository.findById(zoneId);
    if (!zone) throw ApiError.notFound('Zone not found');
    const data = { ...payload };
    delete data.code;
    const updated = await ZoneRepository.update(zoneId, data);
    await cache.del(CACHE.warehouse(zone.warehouseId));
    return shape(updated);
  }

  static async remove(zoneId) {
    const zone = await ZoneRepository.findById(zoneId);
    if (!zone) throw ApiError.notFound('Zone not found');
    const bins = await ZoneRepository.countBins(zoneId);
    if (bins > 0) throw ApiError.conflict('Reassign or delete the bins in this zone first', { bins });
    await ZoneRepository.remove(zoneId);
    await cache.del(CACHE.warehouse(zone.warehouseId));
    return { deleted: true };
  }

  static shape = shape;
}

module.exports = ZoneService;
