'use strict';

const { prisma } = require('../config/prisma');
const { logger } = require('@erp/shared');

class DeadLetterRepository {
  static async record({ event, eventId, reason, rawPayload, retries = 0 }) {
    try {
      return await prisma.auditDeadLetter.create({
        data: {
          event: event ? String(event).slice(0, 100) : null,
          eventId: eventId || null,
          reason: String(reason).slice(0, 500),
          rawPayload: rawPayload || null,
          retries
        }
      });
    } catch (err) {
      logger.error('Failed to store audit dead letter: %s', err.message);
      return null;
    }
  }

  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.auditDeadLetter.findMany({ where, skip, take, orderBy }),
      prisma.auditDeadLetter.count({ where })
    ]);
    return { items, total };
  }

  static async resolve(id) {
    return prisma.auditDeadLetter.update({ where: { id }, data: { resolvedAt: new Date() } });
  }

  static async pending() {
    return prisma.auditDeadLetter.findMany({ where: { resolvedAt: null }, take: 500 });
  }
}

module.exports = DeadLetterRepository;
