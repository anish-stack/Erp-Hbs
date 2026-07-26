'use strict';
const { prisma } = require('../config/prisma');
const DETAIL = { lines: { orderBy: { createdAt: 'asc' } } };

class ShipmentRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.shipment.findMany({ where, skip, take, orderBy, include: { _count: { select: { lines: true } } } }),
      prisma.shipment.count({ where })
    ]);
    return { items, total };
  }
  static findById(id) { return prisma.shipment.findUnique({ where: { id }, include: DETAIL }); }
  static findByOrder(orderId) { return prisma.shipment.findFirst({ where: { orderId, status: { not: 'CANCELLED' } } }); }
  static countYear(year) {
    return prisma.shipment.count({ where: { createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } } });
  }
  static create(data) { return prisma.shipment.create({ data, include: DETAIL }); }
  static update(id, data) { return prisma.shipment.update({ where: { id }, data, include: DETAIL }); }
  static updateLine(lineId, data) { return prisma.shipmentLine.update({ where: { id: lineId }, data }); }
  static staleOpen(before) {
    return prisma.shipment.findMany({ where: { status: { in: ['PENDING', 'PICKING', 'PICKED', 'PACKED'] }, createdAt: { lte: before } }, take: 500 });
  }
  static async stats() {
    const [byStatus, totals] = await prisma.$transaction([
      prisma.shipment.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.shipment.aggregate({ _count: { _all: true } })
    ]);
    return { byStatus, total: totals._count._all };
  }
}
module.exports = ShipmentRepository;
