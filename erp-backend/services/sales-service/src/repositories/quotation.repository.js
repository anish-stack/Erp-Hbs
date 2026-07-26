'use strict';
const { prisma } = require('../config/prisma');
const DETAIL = { lines: { orderBy: { createdAt: 'asc' } } };

class QuotationRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.quotation.findMany({ where, skip, take, orderBy, include: { _count: { select: { lines: true } } } }),
      prisma.quotation.count({ where })
    ]);
    return { items, total };
  }
  static findById(id) { return prisma.quotation.findUnique({ where: { id }, include: DETAIL }); }
  static countYear(year) {
    return prisma.quotation.count({ where: { createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } } });
  }
  static create(data) { return prisma.quotation.create({ data, include: DETAIL }); }
  static update(id, data) { return prisma.quotation.update({ where: { id }, data, include: DETAIL }); }
  static replaceLines(id, lines) {
    return prisma.$transaction(async (tx) => {
      await tx.quotationLine.deleteMany({ where: { quotationId: id } });
      if (lines.length) await tx.quotationLine.createMany({ data: lines.map((l) => ({ ...l, quotationId: id })) });
      return tx.quotation.findUnique({ where: { id }, include: DETAIL });
    });
  }
  static expirable(now) {
    return prisma.quotation.findMany({ where: { status: 'SENT', validUntil: { not: null, lte: now } }, take: 500 });
  }
}
module.exports = QuotationRepository;
