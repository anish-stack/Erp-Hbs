'use strict';

const { prisma } = require('../config/prisma');

class PutawayRuleRepository {
  static async listByWarehouse(warehouseId) {
    return prisma.putawayRule.findMany({
      where: { warehouseId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }]
    });
  }

  static async findById(id) {
    return prisma.putawayRule.findUnique({ where: { id } });
  }

  static async create(data) {
    return prisma.putawayRule.create({ data });
  }

  static async update(id, data) {
    return prisma.putawayRule.update({ where: { id }, data });
  }

  static async remove(id) {
    return prisma.putawayRule.delete({ where: { id } });
  }

  /** Active rules ordered by priority, matched on part first then category. */
  static async match(warehouseId, { partId = null, categoryId = null } = {}) {
    return prisma.putawayRule.findMany({
      where: {
        warehouseId,
        isActive: true,
        OR: [
          ...(partId ? [{ partId }] : []),
          ...(categoryId ? [{ categoryId }] : []),
          { partId: null, categoryId: null }
        ]
      },
      orderBy: [{ priority: 'asc' }]
    });
  }
}

module.exports = PutawayRuleRepository;
