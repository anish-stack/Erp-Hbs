'use strict';

const { ApiError, utils, cache } = require('@erp/shared');
const WarehouseRepository = require('../repositories/warehouse.repository');
const publisher = require('../events/publisher');
const { WAREHOUSE_STATUS, CACHE } = require('../constants');
const config = require('../config');

function shape(w) {
  if (!w) return null;
  return {
    id: w.id,
    code: w.code,
    name: w.name,
    type: w.type,
    status: w.status,
    isActive: w.status === WAREHOUSE_STATUS.ACTIVE,
    address: {
      line1: w.addressLine1,
      line2: w.addressLine2,
      city: w.city,
      state: w.state,
      pincode: w.pincode,
      country: w.country
    },
    contact: { name: w.contactName, phone: w.contactPhone, email: w.contactEmail },
    gstin: w.gstin,
    isDefault: w.isDefault,
    allowNegativeStock: w.allowNegativeStock,
    mslControlled: w.mslControlled,
    timezone: w.timezone,
    notes: w.notes,
    zones: w.zones,
    counts: w._count,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt
  };
}

class WarehouseService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['code', 'name', 'createdAt'],
      defaultSortField: 'createdAt'
    });
    const where = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? { OR: [{ code: { contains: query.search } }, { name: { contains: query.search } }, { city: { contains: query.search } }] }
        : {})
    };
    const { items, total } = await WarehouseRepository.paginate({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy
    });
    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  static async options() {
    return cache.remember(CACHE.options(), config.cacheTtl, () => WarehouseRepository.options());
  }

  static async getById(id) {
    const w = await WarehouseRepository.findById(id, { detailed: true });
    if (!w) throw ApiError.notFound('Warehouse not found');
    return shape(w);
  }

  static async create(payload, user) {
    const code = payload.code.toUpperCase();
    if (await WarehouseRepository.findByCode(code)) {
      throw ApiError.conflict('A warehouse with this code already exists', { field: 'code' });
    }

    if (payload.isDefault) await WarehouseRepository.clearDefault();

    const w = await WarehouseRepository.create({
      code,
      name: payload.name,
      type: payload.type || 'MAIN',
      status: WAREHOUSE_STATUS.ACTIVE,
      addressLine1: payload.addressLine1 || null,
      addressLine2: payload.addressLine2 || null,
      city: payload.city || null,
      state: payload.state || null,
      pincode: payload.pincode || null,
      country: payload.country || 'India',
      contactName: payload.contactName || null,
      contactPhone: payload.contactPhone || null,
      contactEmail: payload.contactEmail || null,
      gstin: payload.gstin ? payload.gstin.toUpperCase() : null,
      isDefault: payload.isDefault || false,
      allowNegativeStock: payload.allowNegativeStock || false,
      mslControlled: payload.mslControlled ?? true,
      timezone: payload.timezone || 'Asia/Kolkata',
      notes: payload.notes || null,
      createdBy: user.id,
      updatedBy: user.id
    });

    await cache.del(CACHE.options());
    await publisher.warehouseCreated(w, user.id);
    return shape(w);
  }

  static async update(id, payload, user) {
    const existing = await WarehouseRepository.findById(id);
    if (!existing) throw ApiError.notFound('Warehouse not found');

    if (payload.isDefault && !existing.isDefault) await WarehouseRepository.clearDefault(id);

    const data = { ...payload, updatedBy: user.id };
    delete data.code;
    delete data.status;
    if (data.gstin) data.gstin = data.gstin.toUpperCase();

    const w = await WarehouseRepository.update(id, data);
    await cache.del(CACHE.warehouse(id), CACHE.options());
    await publisher.warehouseUpdated(w, Object.keys(payload), user.id);
    return shape(w);
  }

  static async setStatus(id, status, user) {
    const existing = await WarehouseRepository.findById(id);
    if (!existing) throw ApiError.notFound('Warehouse not found');
    if (existing.status === status) return shape(existing);

    const w = await WarehouseRepository.update(id, {
      status,
      updatedBy: user.id,
      ...(status === WAREHOUSE_STATUS.INACTIVE ? { isDefault: false } : {})
    });

    await cache.del(CACHE.warehouse(id), CACHE.options());
    if (status === WAREHOUSE_STATUS.ACTIVE) await publisher.warehouseActivated(w, user.id);
    else await publisher.warehouseDeactivated(w, user.id);
    return shape(w);
  }

  static async setDefault(id, user) {
    const existing = await WarehouseRepository.findById(id);
    if (!existing) throw ApiError.notFound('Warehouse not found');
    if (existing.status !== WAREHOUSE_STATUS.ACTIVE) {
      throw ApiError.conflict('Only an active warehouse can be set as default');
    }
    await WarehouseRepository.clearDefault(id);
    const w = await WarehouseRepository.update(id, { isDefault: true, updatedBy: user.id });
    await cache.del(CACHE.options());
    return shape(w);
  }

  static async remove(id, user) {
    const existing = await WarehouseRepository.findById(id, { detailed: true });
    if (!existing) throw ApiError.notFound('Warehouse not found');
    if (existing._count && existing._count.bins > 0) {
      throw ApiError.conflict('Delete or move the bins before deleting this warehouse', {
        bins: existing._count.bins
      });
    }
    await WarehouseRepository.softDelete(id, user.id);
    await cache.del(CACHE.warehouse(id), CACHE.options());
    return { deleted: true };
  }

  static async stats() {
    const raw = await WarehouseRepository.stats();
    return {
      total: raw.totals,
      byStatus: raw.byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      byType: raw.byType.map((r) => ({ type: r.type, count: r._count._all }))
    };
  }

  static async assertExists(id) {
    const w = await WarehouseRepository.findById(id);
    if (!w) throw ApiError.notFound('Warehouse not found');
    return w;
  }

  static shape = shape;
}

module.exports = WarehouseService;
