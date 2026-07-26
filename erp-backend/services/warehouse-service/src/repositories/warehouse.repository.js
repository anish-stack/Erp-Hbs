'use strict';

const { prisma } = require('../config/prisma');

const LIST_SELECT = {
  id: true, code: true, name: true, type: true, status: true,
  city: true, state: true, isDefault: true, mslControlled: true,
  createdAt: true,
  _count: { select: { zones: true, bins: true } }
};

const DETAIL_INCLUDE = {
  zones: { orderBy: { code: 'asc' } },
  _count: { select: { zones: true, bins: true, tasks: true } }
};

class WarehouseRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.warehouse.findMany({ where, skip, take, orderBy, select: LIST_SELECT }),
      prisma.warehouse.count({ where })
    ]);
    return { items, total };
  }

  static async findById(id, { detailed = false } = {}) {
    return prisma.warehouse.findFirst({
      where: { id, deletedAt: null },
      ...(detailed ? { include: DETAIL_INCLUDE } : {})
    });
  }

  static async findByCode(code) {
    return prisma.warehouse.findFirst({ where: { code, deletedAt: null } });
  }

  static async findDefault() {
    return prisma.warehouse.findFirst({ where: { deletedAt: null, isDefault: true } });
  }

  static async options() {
    return prisma.warehouse.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, type: true, isDefault: true }
    });
  }

  static async create(data) {
    return prisma.warehouse.create({ data, include: DETAIL_INCLUDE });
  }

  static async update(id, data) {
    return prisma.warehouse.update({ where: { id }, data, include: DETAIL_INCLUDE });
  }

  static async clearDefault(exceptId) {
    return prisma.warehouse.updateMany({
      where: { isDefault: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
      data: { isDefault: false }
    });
  }

  static async softDelete(id, actorId) {
    return prisma.warehouse.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actorId, status: 'INACTIVE', isDefault: false }
    });
  }

  static async stats() {
    const [byStatus, byType, totals] = await prisma.$transaction([
      prisma.warehouse.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.warehouse.groupBy({ by: ['type'], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.warehouse.count({ where: { deletedAt: null } })
    ]);
    return { byStatus, byType, totals };
  }
}

module.exports = WarehouseRepository;
