'use strict';
const { prisma } = require('../config/prisma');
const DETAIL = { allocations: { include: { invoice: { select: { code: true, type: true } } } } };

class PaymentRepository {
  static get prisma() { return prisma; }
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.payment.findMany({ where, skip, take, orderBy, include: { _count: { select: { allocations: true } } } }),
      prisma.payment.count({ where })
    ]);
    return { items, total };
  }
  static findById(id) { return prisma.payment.findUnique({ where: { id }, include: DETAIL }); }
  static countYear(year) {
    return prisma.payment.count({ where: { createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } } });
  }
}
module.exports = PaymentRepository;
