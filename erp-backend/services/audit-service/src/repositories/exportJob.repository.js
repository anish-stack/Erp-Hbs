'use strict';

const { prisma } = require('../config/prisma');

class ExportJobRepository {
  static async create(data) {
    return prisma.exportJob.create({ data });
  }

  static async update(id, data) {
    return prisma.exportJob.update({ where: { id }, data });
  }

  static async findById(id) {
    return prisma.exportJob.findUnique({ where: { id } });
  }

  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.exportJob.findMany({ where, skip, take, orderBy }),
      prisma.exportJob.count({ where })
    ]);
    return { items, total };
  }

  static async expired(before = new Date()) {
    return prisma.exportJob.findMany({
      where: { expiresAt: { lt: before }, filePath: { not: null } }
    });
  }

  static async clearFiles(ids) {
    return prisma.exportJob.updateMany({
      where: { id: { in: ids } },
      data: { filePath: null, message: 'Export file expired and was removed' }
    });
  }
}

module.exports = ExportJobRepository;
