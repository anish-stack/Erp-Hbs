'use strict';
const { prisma } = require('../config/prisma');

class ReportRunRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.reportRun.findMany({ where, skip, take, orderBy }),
      prisma.reportRun.count({ where })
    ]);
    return { items, total };
  }
  static findById(id) { return prisma.reportRun.findUnique({ where: { id } }); }
  static countYear(year) {
    return prisma.reportRun.count({ where: { createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } } });
  }
  static create(data) { return prisma.reportRun.create({ data }); }
  static update(id, data) { return prisma.reportRun.update({ where: { id }, data }); }
  static purgeOlderThan(before) {
    return prisma.reportRun.deleteMany({ where: { createdAt: { lt: before }, status: { in: ['COMPLETED', 'FAILED'] } } });
  }
}
module.exports = ReportRunRepository;
