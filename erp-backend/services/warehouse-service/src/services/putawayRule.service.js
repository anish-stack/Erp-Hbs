'use strict';

const { ApiError, cache } = require('@erp/shared');
const PutawayRuleRepository = require('../repositories/putawayRule.repository');
const ZoneRepository = require('../repositories/zone.repository');
const BinRepository = require('../repositories/bin.repository');
const WarehouseService = require('./warehouse.service');
const { CACHE } = require('../constants');

function shape(r) {
  return {
    id: r.id,
    warehouseId: r.warehouseId,
    name: r.name,
    categoryId: r.categoryId,
    partId: r.partId,
    strategy: r.strategy,
    targetZoneType: r.targetZoneType,
    targetZoneId: r.targetZoneId,
    requiresMsl: r.requiresMsl,
    priority: r.priority,
    isActive: r.isActive,
    createdAt: r.createdAt
  };
}

class PutawayRuleService {
  static async list(warehouseId) {
    await WarehouseService.assertExists(warehouseId);
    const rules = await PutawayRuleRepository.listByWarehouse(warehouseId);
    return rules.map(shape);
  }

  static async create(warehouseId, payload) {
    await WarehouseService.assertExists(warehouseId);
    const rule = await PutawayRuleRepository.create({
      warehouseId,
      name: payload.name,
      categoryId: payload.categoryId || null,
      partId: payload.partId || null,
      strategy: payload.strategy || 'NEAREST',
      targetZoneType: payload.targetZoneType || null,
      targetZoneId: payload.targetZoneId || null,
      requiresMsl: payload.requiresMsl || false,
      priority: payload.priority ?? 100,
      isActive: payload.isActive ?? true
    });
    await cache.del(CACHE.warehouse(warehouseId));
    return shape(rule);
  }

  static async update(ruleId, payload) {
    const rule = await PutawayRuleRepository.findById(ruleId);
    if (!rule) throw ApiError.notFound('Putaway rule not found');
    const updated = await PutawayRuleRepository.update(ruleId, payload);
    await cache.del(CACHE.warehouse(rule.warehouseId));
    return shape(updated);
  }

  static async remove(ruleId) {
    const rule = await PutawayRuleRepository.findById(ruleId);
    if (!rule) throw ApiError.notFound('Putaway rule not found');
    await PutawayRuleRepository.remove(ruleId);
    await cache.del(CACHE.warehouse(rule.warehouseId));
    return { deleted: true };
  }

  /**
   * Resolves the best destination bin for an incoming part. Walks the matched
   * rules by priority, honouring the target zone and MSL requirement, and falls
   * back to any available bin in the warehouse.
   */
  static async resolveBin(warehouseId, { partId = null, categoryId = null, needUnits = 0, mslRequired = null } = {}) {
    const rules = await PutawayRuleRepository.match(warehouseId, { partId, categoryId });

    for (const rule of rules) {
      let zoneId = rule.targetZoneId;
      if (!zoneId && rule.targetZoneType) {
        const zone = await ZoneRepository.firstOfType(warehouseId, rule.targetZoneType);
        zoneId = zone ? zone.id : null;
      }
      const bin = await BinRepository.findAvailable(warehouseId, {
        zoneId,
        mslZone: rule.requiresMsl ? true : mslRequired,
        needUnits
      });
      if (bin) return { bin: BinService_shape(bin), rule: shape(rule) };
    }

    const fallback = await BinRepository.findAvailable(warehouseId, { needUnits, mslZone: mslRequired });
    return { bin: fallback ? BinService_shape(fallback) : null, rule: null };
  }

  static shape = shape;
}

// Lightweight bin shaper to avoid a circular require with bin.service.
function BinService_shape(b) {
  return {
    id: b.id,
    warehouseId: b.warehouseId,
    zoneId: b.zoneId,
    code: b.code,
    status: b.status,
    currentUnits: b.currentUnits,
    maxUnits: b.maxUnits,
    mslZone: b.mslZone
  };
}

module.exports = PutawayRuleService;
