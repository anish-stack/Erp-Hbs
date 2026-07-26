'use strict';
const { prisma } = require('../config/prisma');

const LIST_SELECT = {
  id: true, code: true, supplierId: true, supplierCode: true, supplierName: true, status: true,
  currencyCode: true, grandTotal: true, expectedDate: true, requestedBy: true, approvalRequired: true,
  createdAt: true, _count: { select: { lines: true, grns: true } }
};

const DETAIL_INCLUDE = {
  lines: { orderBy: { lineNumber: 'asc' } },
  grns: { orderBy: { createdAt: 'desc' } },
  statusLogs: { orderBy: { createdAt: 'desc' }, take: 15 }
};

class PoRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.purchaseOrder.findMany({ where, skip, take, orderBy, select: LIST_SELECT }),
      prisma.purchaseOrder.count({ where })
    ]);
    return { items, total };
  }

  static async findById(id) {
    return prisma.purchaseOrder.findFirst({ where: { id, deletedAt: null }, include: DETAIL_INCLUDE });
  }

  static async findRawById(id) {
    return prisma.purchaseOrder.findFirst({ where: { id, deletedAt: null } });
  }

  static async create(data, lines, actorId) {
    return prisma.purchaseOrder.create({ data: { ...data, createdBy: actorId, updatedBy: actorId, lines: { create: lines } }, include: DETAIL_INCLUDE });
  }

  static async update(id, data, actorId) {
    return prisma.purchaseOrder.update({ where: { id }, data: { ...data, updatedBy: actorId }, include: DETAIL_INCLUDE });
  }

  static async softDelete(id, actorId) {
    return prisma.purchaseOrder.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actorId } });
  }

  static async logStatus(data) { return prisma.poStatusLog.create({ data }); }

  static async updateLineReceipt(lineId, data) {
    return prisma.poLine.update({ where: { id: lineId }, data });
  }

  static async findLine(lineId) { return prisma.poLine.findUnique({ where: { id: lineId } }); }

  static async overdue(before) {
    return prisma.purchaseOrder.findMany({
      where: { deletedAt: null, status: { in: ['ISSUED', 'PARTIALLY_RECEIVED'] }, expectedDate: { lt: before } },
      select: { id: true, code: true, supplierId: true, requestedBy: true }
    });
  }

  static async stats() {
    const [byStatus, totals] = await prisma.$transaction([
      prisma.purchaseOrder.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true }, _sum: { grandTotal: true } }),
      prisma.purchaseOrder.aggregate({ where: { deletedAt: null }, _count: { _all: true }, _sum: { grandTotal: true } })
    ]);
    return { byStatus, totals };
  }

  static get LIST_SELECT() { return LIST_SELECT; }
}

module.exports = PoRepository;
