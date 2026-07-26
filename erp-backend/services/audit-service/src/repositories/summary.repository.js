'use strict';

const { prisma } = require('../config/prisma');

class SummaryRepository {
  static async upsertDaily({ day, entity, action, total, actorCount }) {
    return prisma.auditSummary.upsert({
      where: { day_entity_action: { day, entity, action } },
      update: { total, actorCount },
      create: { day, entity, action, total, actorCount }
    });
  }

  static async range(from, to, entity = null) {
    return prisma.auditSummary.findMany({
      where: { day: { gte: from, lte: to }, ...(entity ? { entity } : {}) },
      orderBy: [{ day: 'asc' }, { entity: 'asc' }]
    });
  }
}

module.exports = SummaryRepository;
