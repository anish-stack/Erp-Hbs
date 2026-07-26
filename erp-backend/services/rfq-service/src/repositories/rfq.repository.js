'use strict';

const { prisma } = require('../config/prisma');

const LIST_SELECT = {
  id: true, code: true, title: true, status: true, currencyCode: true,
  requestedBy: true, validTill: true, responseDeadline: true, sentAt: true, awardedAt: true,
  createdAt: true,
  _count: { select: { lines: true, suppliers: true } }
};

const DETAIL_INCLUDE = {
  lines: { orderBy: { lineNumber: 'asc' } },
  suppliers: { orderBy: { invitedAt: 'asc' }, include: { quote: { include: { lines: true } } } },
  statusLogs: { orderBy: { createdAt: 'desc' }, take: 15 }
};

class RfqRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.rfq.findMany({ where, skip, take, orderBy, select: LIST_SELECT }),
      prisma.rfq.count({ where })
    ]);
    return { items, total };
  }

  static async findById(id) {
    return prisma.rfq.findFirst({ where: { id, deletedAt: null }, include: DETAIL_INCLUDE });
  }

  static async findRawById(id) {
    return prisma.rfq.findFirst({ where: { id, deletedAt: null } });
  }

  static async create(data, lines, actorId) {
    return prisma.rfq.create({
      data: {
        ...data,
        createdBy: actorId,
        updatedBy: actorId,
        lines: { create: lines }
      },
      include: DETAIL_INCLUDE
    });
  }

  static async update(id, data, actorId) {
    return prisma.rfq.update({ where: { id }, data: { ...data, updatedBy: actorId }, include: DETAIL_INCLUDE });
  }

  static async softDelete(id, actorId) {
    return prisma.rfq.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actorId } });
  }

  static async logStatus(data) {
    return prisma.rfqStatusLog.create({ data });
  }

  static async addSuppliers(rfqId, rows) {
    return prisma.rfqSupplier.createMany({ data: rows.map((row) => ({ ...row, rfqId })), skipDuplicates: true });
  }

  static async removeSupplier(rfqId, supplierId) {
    return prisma.rfqSupplier.deleteMany({ where: { rfqId, supplierId } });
  }

  static async findRfqSupplier(rfqId, supplierId) {
    return prisma.rfqSupplier.findUnique({ where: { rfqId_supplierId: { rfqId, supplierId } } });
  }

  static async updateRfqSupplier(id, data) {
    return prisma.rfqSupplier.update({ where: { id }, data });
  }

  static async countSuppliersByStatus(rfqId) {
    return prisma.rfqSupplier.groupBy({ by: ['status'], where: { rfqId }, _count: { _all: true } });
  }

  static async awardLine(lineId, data) {
    return prisma.rfqLine.update({ where: { id: lineId }, data });
  }

  static async findLine(lineId) {
    return prisma.rfqLine.findUnique({ where: { id: lineId } });
  }

  static async dueForDeadlineCheck(before) {
    return prisma.rfq.findMany({
      where: { deletedAt: null, status: { in: ['SENT', 'QUOTING'] }, responseDeadline: { lt: before } },
      select: { id: true, code: true, title: true, requestedBy: true }
    });
  }

  static async stats() {
    const [byStatus, totals] = await prisma.$transaction([
      prisma.rfq.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.rfq.aggregate({ where: { deletedAt: null }, _count: { _all: true } })
    ]);
    return { byStatus, totals };
  }

  static get LIST_SELECT() { return LIST_SELECT; }
}

module.exports = RfqRepository;
