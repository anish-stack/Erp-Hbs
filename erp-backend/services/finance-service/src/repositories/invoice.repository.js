'use strict';
const { prisma } = require('../config/prisma');
const DETAIL = { lines: { orderBy: { createdAt: 'asc' } }, allocations: true };

class InvoiceRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.invoice.findMany({ where, skip, take, orderBy, include: { _count: { select: { lines: true } } } }),
      prisma.invoice.count({ where })
    ]);
    return { items, total };
  }
  static findById(id) { return prisma.invoice.findUnique({ where: { id }, include: DETAIL }); }
  static findBySource(sourceType, sourceId, type) {
    return prisma.invoice.findFirst({ where: { sourceType, sourceId, type } });
  }
  static countTypeYear(type, year) {
    return prisma.invoice.count({ where: { type, createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } } });
  }
  static create(data) { return prisma.invoice.create({ data, include: DETAIL }); }
  static update(id, data) { return prisma.invoice.update({ where: { id }, data, include: DETAIL }); }
  static overdueCandidates(now) {
    return prisma.invoice.findMany({ where: { status: { in: ['ISSUED', 'PARTIALLY_PAID'] }, dueDate: { not: null, lt: now } }, take: 500 });
  }
  static async stats() {
    const [byStatus, byType, outstanding] = await prisma.$transaction([
      prisma.invoice.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.invoice.groupBy({ by: ['type'], where: { status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } }, _sum: { amountDue: true } }),
      prisma.invoice.aggregate({ where: { status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } }, _sum: { amountDue: true } })
    ]);
    return { byStatus, byType, outstanding };
  }
}
module.exports = InvoiceRepository;
