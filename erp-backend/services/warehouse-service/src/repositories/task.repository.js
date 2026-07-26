'use strict';

const { prisma } = require('../config/prisma');

class TaskRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.warehouseTask.findMany({ where, skip, take, orderBy }),
      prisma.warehouseTask.count({ where })
    ]);
    return { items, total };
  }

  static async findById(id) {
    return prisma.warehouseTask.findUnique({ where: { id } });
  }

  static async create(data) {
    return prisma.warehouseTask.create({ data });
  }

  static async update(id, data) {
    return prisma.warehouseTask.update({ where: { id }, data });
  }

  static async countThisYear(year) {
    return prisma.warehouseTask.count({
      where: { createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } }
    });
  }

  static async staleOpen(before) {
    return prisma.warehouseTask.findMany({
      where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] }, createdAt: { lte: before } },
      take: 500
    });
  }
}

module.exports = TaskRepository;
