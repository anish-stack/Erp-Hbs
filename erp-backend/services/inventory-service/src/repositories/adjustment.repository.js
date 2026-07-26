'use strict';

const { prisma } = require('../config/prisma');

const DETAIL_INCLUDE = { lines: { orderBy: { createdAt: 'asc' } } };

class AdjustmentRepository {
  static async create(data) {
    return prisma.stockAdjustment.create({ data, include: DETAIL_INCLUDE });
  }

  static async findById(id, { detailed = true } = {}) {
    return prisma.stockAdjustment.findUnique({
      where: { id },
      ...(detailed ? { include: DETAIL_INCLUDE } : {})
    });
  }

  static async update(id, data) {
    return prisma.stockAdjustment.update({ where: { id }, data, include: DETAIL_INCLUDE });
  }

  static async replaceLines(id, lines) {
    return prisma.$transaction(async (tx) => {
      await tx.stockAdjustmentLine.deleteMany({ where: { adjustmentId: id } });
      if (lines.length) {
        await tx.stockAdjustmentLine.createMany({
          data: lines.map((line) => ({ ...line, adjustmentId: id }))
        });
      }
      return tx.stockAdjustment.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    });
  }

  static async paginate({ where, skip, take }) {
    const [items, total] = await prisma.$transaction([
      prisma.stockAdjustment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { lines: true } } }
      }),
      prisma.stockAdjustment.count({ where })
    ]);
    return { items, total };
  }

  static async countByType(type, year) {
    return prisma.stockAdjustment.count({
      where: { type, createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } }
    });
  }
}

module.exports = AdjustmentRepository;
