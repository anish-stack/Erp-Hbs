'use strict';
const { prisma } = require('../config/prisma');

const DETAIL = { results: { orderBy: { createdAt: 'asc' } } };

class InspectionRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.inspection.findMany({ where, skip, take, orderBy, include: { _count: { select: { results: true } } } }),
      prisma.inspection.count({ where })
    ]);
    return { items, total };
  }
  static findById(id, { detailed = true } = {}) {
    return prisma.inspection.findUnique({ where: { id }, ...(detailed ? { include: DETAIL } : {}) });
  }
  static findByGrn(grnId, partId) {
    return prisma.inspection.findFirst({ where: { grnId, ...(partId ? { partId } : {}) } });
  }
  static create(data) { return prisma.inspection.create({ data, include: DETAIL }); }
  static update(id, data) { return prisma.inspection.update({ where: { id }, data, include: DETAIL }); }
  static addResults(rows) { return prisma.inspectionResult.createMany({ data: rows }); }
  static clearResults(inspectionId) { return prisma.inspectionResult.deleteMany({ where: { inspectionId } }); }
  static countYear(year) {
    return prisma.inspection.count({ where: { createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } } });
  }
  static staleOpen(before) {
    return prisma.inspection.findMany({ where: { status: { in: ['PENDING', 'IN_PROGRESS', 'ON_HOLD'] }, createdAt: { lte: before } }, take: 500 });
  }
  static async stats() {
    const [byStatus, byDisposition, totals] = await prisma.$transaction([
      prisma.inspection.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.inspection.groupBy({ by: ['disposition'], where: { disposition: { not: null } }, _count: { _all: true } }),
      prisma.inspection.aggregate({ _sum: { receivedQty: true, acceptedQty: true, rejectedQty: true } })
    ]);
    return { byStatus, byDisposition, totals };
  }
}
module.exports = InspectionRepository;
