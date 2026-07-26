'use strict';

const { prisma } = require('../config/prisma');

class FileRepository {
  static async create(data) {
    return prisma.file.create({ data });
  }

  static async findById(id) {
    return prisma.file.findFirst({ where: { id, deletedAt: null } });
  }

  static async findByKey(storageKey) {
    return prisma.file.findFirst({ where: { storageKey, deletedAt: null } });
  }

  static async findByChecksum(checksum, uploadedBy) {
    return prisma.file.findFirst({ where: { checksum, uploadedBy, deletedAt: null } });
  }

  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.file.findMany({ where, skip, take, orderBy }),
      prisma.file.count({ where })
    ]);
    return { items, total };
  }

  static async listForEntity(entity, entityId) {
    return prisma.file.findMany({
      where: { entity, entityId, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async update(id, data) {
    return prisma.file.update({ where: { id }, data });
  }

  static async softDelete(id, actorId) {
    return prisma.file.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actorId }
    });
  }

  static async registerAccess(id) {
    return prisma.file.update({
      where: { id },
      data: { downloadCount: { increment: 1 }, lastAccessAt: new Date() }
    });
  }

  static async orphans(olderThan) {
    return prisma.file.findMany({
      where: { entity: null, entityId: null, deletedAt: null, createdAt: { lt: olderThan } },
      take: 500
    });
  }

  static async stats(where = { deletedAt: null }) {
    const [byCategory, byProvider, totals] = await prisma.$transaction([
      prisma.file.groupBy({ by: ['category'], where, _count: { _all: true }, _sum: { sizeBytes: true } }),
      prisma.file.groupBy({ by: ['provider'], where, _count: { _all: true }, _sum: { sizeBytes: true } }),
      prisma.file.aggregate({ where, _count: { _all: true }, _sum: { sizeBytes: true, downloadCount: true } })
    ]);
    return { byCategory, byProvider, totals };
  }
}

module.exports = FileRepository;
