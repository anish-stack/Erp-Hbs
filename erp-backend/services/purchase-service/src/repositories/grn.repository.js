'use strict';
const { prisma } = require('../config/prisma');

class GrnRepository {
  static async create(data, lines) {
    return prisma.grn.create({ data: { ...data, lines: { create: lines } }, include: { lines: true } });
  }

  static async findById(id) {
    return prisma.grn.findUnique({ where: { id }, include: { lines: true } });
  }

  static async update(id, data) {
    return prisma.grn.update({ where: { id }, data, include: { lines: true } });
  }

  static async updateLine(id, data) {
    return prisma.grnLine.update({ where: { id }, data });
  }

  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.grn.findMany({ where, skip, take, orderBy, include: { lines: true } }),
      prisma.grn.count({ where })
    ]);
    return { items, total };
  }

  static async forPo(poId) {
    return prisma.grn.findMany({ where: { poId }, include: { lines: true }, orderBy: { createdAt: 'desc' } });
  }
}

module.exports = GrnRepository;
