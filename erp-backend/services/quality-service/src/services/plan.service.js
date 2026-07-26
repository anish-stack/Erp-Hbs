'use strict';
const { ApiError, cache } = require('@erp/shared');
const PlanRepository = require('../repositories/plan.repository');
const { CACHE } = require('../constants');

function shape(p) {
  return {
    id: p.id, code: p.code, name: p.name, partId: p.partId, categoryId: p.categoryId,
    samplingPlan: p.samplingPlan, aqlLevel: p.aqlLevel, sampleSize: p.sampleSize,
    checkpoints: p.checkpoints || [], isActive: p.isActive, createdAt: p.createdAt
  };
}

async function nextCode() {
  const year = new Date().getFullYear();
  const n = await PlanRepository.countYear(year).catch(() => 0);
  return `QP-${year}-${String(n + 1).padStart(4, '0')}`;
}

class PlanService {
  static async list(query) {
    const where = {
      ...(query.partId ? { partId: query.partId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {})
    };
    return (await PlanRepository.list(where)).map(shape);
  }
  static async getById(id) {
    const p = await PlanRepository.findById(id);
    if (!p) throw ApiError.notFound('Inspection plan not found');
    return shape(p);
  }
  static async create(payload, user) {
    const p = await PlanRepository.create({
      code: payload.code ? payload.code.toUpperCase() : await nextCode(),
      name: payload.name,
      partId: payload.partId || null,
      categoryId: payload.categoryId || null,
      samplingPlan: payload.samplingPlan || 'SAMPLE',
      aqlLevel: payload.aqlLevel || null,
      sampleSize: payload.sampleSize ?? null,
      checkpoints: payload.checkpoints || [],
      isActive: payload.isActive ?? true,
      createdBy: user.id
    });
    await cache.del(CACHE.plans());
    return shape(p);
  }
  static async update(id, payload) {
    await PlanService.getById(id);
    const data = { ...payload }; delete data.code;
    const p = await PlanRepository.update(id, data);
    await cache.del(CACHE.plans());
    return shape(p);
  }
  static async remove(id) {
    await PlanService.getById(id);
    await PlanRepository.remove(id);
    await cache.del(CACHE.plans());
    return { deleted: true };
  }
  static shape = shape;
}
module.exports = PlanService;
