'use strict';

const { prisma } = require('../config/prisma');

class BinRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.bin.findMany({ where, skip, take, orderBy }),
      prisma.bin.count({ where })
    ]);
    return { items, total };
  }

  static async findById(id) {
    return prisma.bin.findUnique({ where: { id } });
  }

  static async findByCode(warehouseId, code) {
    return prisma.bin.findUnique({ where: { binCode: { warehouseId, code } } });
  }

  static async create(data) {
    return prisma.bin.create({ data });
  }

  static async createMany(rows) {
    return prisma.bin.createMany({ data: rows, skipDuplicates: true });
  }

  static async update(id, data) {
    return prisma.bin.update({ where: { id }, data });
  }

  static async remove(id) {
    return prisma.bin.delete({ where: { id } });
  }

  /** Suggest an available, pickable bin in the target zone with free capacity. */
  static async findAvailable(warehouseId, { zoneId = null, mslZone = null, needUnits = 0 } = {}) {
    return prisma.bin.findFirst({
      where: {
        warehouseId,
        status: 'AVAILABLE',
        ...(zoneId ? { zoneId } : {}),
        ...(mslZone !== null ? { mslZone } : {}),
        OR: [{ maxUnits: null }, { maxUnits: { gte: needUnits } }]
      },
      orderBy: [{ currentUnits: 'asc' }, { code: 'asc' }]
    });
  }

  static async adjustOccupancy(id, delta) {
    const bin = await prisma.bin.findUnique({ where: { id } });
    if (!bin) return null;
    const next = Math.max(0, bin.currentUnits + delta);
    const status =
      bin.maxUnits && next >= bin.maxUnits && bin.status === 'AVAILABLE'
        ? 'FULL'
        : bin.status === 'FULL' && (!bin.maxUnits || next < bin.maxUnits)
          ? 'AVAILABLE'
          : bin.status;
    return prisma.bin.update({ where: { id }, data: { currentUnits: next, status } });
  }
}

module.exports = BinRepository;
