'use strict';

const { prisma } = require('../config/prisma');

class AuditRepository {
  /** Idempotent insert: duplicate broker deliveries are ignored. */
  static async insert(row) {
    const result = await prisma.auditLog.createMany({ data: [row], skipDuplicates: true });
    return result.count === 1;
  }

  static async insertMany(rows) {
    const result = await prisma.auditLog.createMany({ data: rows, skipDuplicates: true });
    return result.count;
  }

  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({ where, skip, take, orderBy }),
      prisma.auditLog.count({ where })
    ]);
    return { items, total };
  }

  static async findById(id) {
    return prisma.auditLog.findUnique({ where: { id } });
  }

  static async timeline(entity, entityId, { skip = 0, take = 50 } = {}) {
    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where: { entity, entityId },
        orderBy: { occurredAt: 'desc' },
        skip,
        take
      }),
      prisma.auditLog.count({ where: { entity, entityId } })
    ]);
    return { items, total };
  }

  static async correlated(correlationId) {
    return prisma.auditLog.findMany({
      where: { correlationId },
      orderBy: { occurredAt: 'asc' }
    });
  }

  static async stream(where, handler, batchSize = 1000, maxRows = 100000) {
    let cursor = null;
    let processed = 0;

    for (;;) {
      const batch = await prisma.auditLog.findMany({
        where,
        orderBy: [{ occurredAt: 'desc' }, { id: 'asc' }],
        take: batchSize,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
      });

      if (!batch.length) break;

      await handler(batch);
      processed += batch.length;
      cursor = batch[batch.length - 1].id;

      if (batch.length < batchSize || processed >= maxRows) break;
    }

    return processed;
  }

  static async stats(where) {
    const [byAction, bySeverity, byEntity, total, actors] = await prisma.$transaction([
      prisma.auditLog.groupBy({ by: ['action'], where, _count: { _all: true } }),
      prisma.auditLog.groupBy({ by: ['severity'], where, _count: { _all: true } }),
      prisma.auditLog.groupBy({
        by: ['entity'],
        where,
        _count: { _all: true },
        orderBy: { _count: { entity: 'desc' } },
        take: 15
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where: { ...where, actorId: { not: null } },
        distinct: ['actorId'],
        select: { actorId: true },
        take: 1000
      })
    ]);

    return { byAction, bySeverity, byEntity, total, uniqueActors: actors.length };
  }

  static async topActors(where, take = 10) {
    return prisma.auditLog.groupBy({
      by: ['actorId', 'actorEmail'],
      where: { ...where, actorId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { actorId: 'desc' } },
      take
    });
  }

  /** Raw rollup source: one row per day + entity + action. */
  static async dailyCounts(from, to) {
    return prisma.$queryRaw`
      SELECT DATE(occurredAt) AS day,
             entity,
             action,
             COUNT(*) AS total,
             COUNT(DISTINCT actorId) AS actors
      FROM audit_logs
      WHERE occurredAt >= ${from} AND occurredAt < ${to}
      GROUP BY DATE(occurredAt), entity, action
    `;
  }

  static async purgeOlderThan(cutoff) {
    const result = await prisma.auditLog.deleteMany({ where: { occurredAt: { lt: cutoff } } });
    return result.count;
  }
}

module.exports = AuditRepository;
