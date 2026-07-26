'use strict';

const { prisma } = require('../config/prisma');

class ZoneRepository {
  static async listByWarehouse(warehouseId) {
    return prisma.zone.findMany({
      where: { warehouseId },
      orderBy: { code: 'asc' },
      include: { _count: { select: { bins: true } } }
    });
  }

  static async findById(id) {
    return prisma.zone.findUnique({ where: { id } });
  }

  static async findByCode(warehouseId, code) {
    return prisma.zone.findUnique({ where: { zoneCode: { warehouseId, code } } });
  }

  static async firstOfType(warehouseId, type) {
    return prisma.zone.findFirst({ where: { warehouseId, type, isActive: true }, orderBy: { code: 'asc' } });
  }

  static async create(data) {
    return prisma.zone.create({ data });
  }

  static async update(id, data) {
    return prisma.zone.update({ where: { id }, data });
  }

  static async remove(id) {
    return prisma.zone.delete({ where: { id } });
  }

  static async countBins(zoneId) {
    return prisma.bin.count({ where: { zoneId } });
  }
}

module.exports = ZoneRepository;
