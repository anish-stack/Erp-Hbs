'use strict';
const { prisma } = require('../config/prisma');

class PlanRepository {
  static async list(where) {
    return prisma.inspectionPlan.findMany({ where, orderBy: { createdAt: 'desc' } });
  }
  static findById(id) { return prisma.inspectionPlan.findUnique({ where: { id } }); }
  static findByCode(code) { return prisma.inspectionPlan.findUnique({ where: { code } }); }
  static create(data) { return prisma.inspectionPlan.create({ data }); }
  static update(id, data) { return prisma.inspectionPlan.update({ where: { id }, data }); }
  static remove(id) { return prisma.inspectionPlan.delete({ where: { id } }); }
  static matchForPart(partId, categoryId) {
    return prisma.inspectionPlan.findFirst({
      where: { isActive: true, OR: [{ partId }, ...(categoryId ? [{ categoryId }] : [])] },
      orderBy: [{ partId: 'desc' }]
    });
  }
  static countYear(year) {
    return prisma.inspectionPlan.count({ where: { createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } } });
  }
}
module.exports = PlanRepository;
