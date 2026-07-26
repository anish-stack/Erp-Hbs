'use strict';

const { prisma } = require('../config/prisma');

class PurgeTaskRepository {
  static async create(data) {
    return prisma.purgeTask.create({ data });
  }

  static async pending(take = 200) {
    return prisma.purgeTask.findMany({
      where: { purgedAt: null, attempts: { lt: 10 } },
      orderBy: { createdAt: 'asc' },
      take
    });
  }

  static async markPurged(id) {
    return prisma.purgeTask.update({ where: { id }, data: { purgedAt: new Date() } });
  }

  static async markFailed(id, error) {
    return prisma.purgeTask.update({
      where: { id },
      data: { attempts: { increment: 1 }, lastError: String(error).slice(0, 500) }
    });
  }
}

module.exports = PurgeTaskRepository;
