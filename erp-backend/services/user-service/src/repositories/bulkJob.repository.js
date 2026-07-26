'use strict';

const { prisma } = require('../config/prisma');

class BulkJobRepository {
  static async create(data) {
    return prisma.bulkJob.create({ data });
  }

  static async update(id, data) {
    return prisma.bulkJob.update({ where: { id }, data });
  }

  static async findById(id) {
    return prisma.bulkJob.findUnique({ where: { id } });
  }

  static async findForUser(id, userId) {
    return prisma.bulkJob.findFirst({ where: { id, requestedBy: userId } });
  }

  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.bulkJob.findMany({ where, skip, take, orderBy }),
      prisma.bulkJob.count({ where })
    ]);
    return { items, total };
  }

  static async expired(before = new Date()) {
    return prisma.bulkJob.findMany({
      where: { expiresAt: { lt: before }, filePath: { not: null } }
    });
  }

  static async clearFilePath(ids) {
    return prisma.bulkJob.updateMany({
      where: { id: { in: ids } },
      data: { filePath: null, message: 'Export file expired and was removed' }
    });
  }
}

module.exports = BulkJobRepository;
