'use strict';

const { prisma } = require('../config/prisma');

class ShareRepository {
  static async create(data) {
    return prisma.fileShare.create({ data });
  }

  static async findByToken(token) {
    return prisma.fileShare.findUnique({ where: { token }, include: { file: true } });
  }

  static async listForFile(fileId) {
    return prisma.fileShare.findMany({
      where: { fileId, revokedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async registerUse(id) {
    return prisma.fileShare.update({ where: { id }, data: { useCount: { increment: 1 } } });
  }

  static async revoke(id) {
    return prisma.fileShare.update({ where: { id }, data: { revokedAt: new Date() } });
  }
}

module.exports = ShareRepository;
