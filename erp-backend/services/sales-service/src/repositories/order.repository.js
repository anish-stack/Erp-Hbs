'use strict';
const { prisma } = require('../config/prisma');
const DETAIL = { lines: { orderBy: { createdAt: 'asc' } } };

class OrderRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.salesOrder.findMany({ where, skip, take, orderBy, include: { _count: { select: { lines: true } } } }),
      prisma.salesOrder.count({ where })
    ]);
    return { items, total };
  }
  static findById(id) { return prisma.salesOrder.findUnique({ where: { id }, include: DETAIL }); }
  static countYear(year) {
    return prisma.salesOrder.count({ where: { createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } } });
  }
  static create(data) { return prisma.salesOrder.create({ data, include: DETAIL }); }
  static update(id, data) { return prisma.salesOrder.update({ where: { id }, data, include: DETAIL }); }
  static updateLine(lineId, data) { return prisma.salesOrderLine.update({ where: { id: lineId }, data }); }
  static replaceLines(id, lines) {
    return prisma.$transaction(async (tx) => {
      await tx.salesOrderLine.deleteMany({ where: { orderId: id } });
      if (lines.length) await tx.salesOrderLine.createMany({ data: lines.map((l) => ({ ...l, orderId: id })) });
      return tx.salesOrder.findUnique({ where: { id }, include: DETAIL });
    });
  }
  static async stats() {
    const [byStatus, totals] = await prisma.$transaction([
      prisma.salesOrder.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.salesOrder.aggregate({ _sum: { grandTotal: true }, _count: { _all: true } })
    ]);
    return { byStatus, totals };
  }
}
module.exports = OrderRepository;
