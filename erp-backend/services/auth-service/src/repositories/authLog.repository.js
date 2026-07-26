'use strict';

const { prisma } = require('../config/prisma');
const { logger } = require('@erp/shared');

class AuthLogRepository {
  /** Audit writes must never break an auth flow. */
  static async record(entry) {
    try {
      return await prisma.authLog.create({ data: entry });
    } catch (err) {
      logger.error('Failed to write auth log: %s', err.message);
      return null;
    }
  }

  static async listByUser(userId, { skip = 0, take = 20 } = {}) {
    const [items, total] = await prisma.$transaction([
      prisma.authLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.authLog.count({ where: { userId } })
    ]);
    return { items, total };
  }
}

module.exports = AuthLogRepository;
