'use strict';

const { ApiError, utils, cache, middlewares } = require('@erp/shared');
const AuditRepository = require('../repositories/audit.repository');
const SummaryRepository = require('../repositories/summary.repository');
const DeadLetterRepository = require('../repositories/deadLetter.repository');
const config = require('../config');
const { CACHE } = require('../constants');

const { hasPermission } = middlewares;

function buildWhere(query) {
  const where = {};

  if (query.entity) where.entity = query.entity;
  if (query.entityId) where.entityId = query.entityId;
  if (query.action) where.action = query.action;
  if (query.severity) where.severity = query.severity;
  if (query.actorId) where.actorId = query.actorId;
  if (query.source) where.source = query.source;
  if (query.channel) where.channel = query.channel;
  if (query.correlationId) where.correlationId = query.correlationId;
  if (query.event) where.event = { contains: query.event };

  if (query.search) {
    where.OR = [
      { summary: { contains: query.search } },
      { actorEmail: { contains: query.search } },
      { entityId: { contains: query.search } },
      { event: { contains: query.search } }
    ];
  }

  if (query.dateFrom || query.dateTo) {
    where.occurredAt = {};
    if (query.dateFrom) where.occurredAt.gte = new Date(query.dateFrom);
    if (query.dateTo) {
      const to = new Date(query.dateTo);
      to.setHours(23, 59, 59, 999);
      where.occurredAt.lte = to;
    }
  }

  return where;
}

function hashFilters(where) {
  return utils.password.sha256(JSON.stringify(where)).slice(0, 16);
}

class AuditService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['occurredAt', 'createdAt', 'entity', 'action', 'severity'],
      defaultSortField: 'occurredAt'
    });

    const { items, total } = await AuditRepository.paginate({
      where: buildWhere(query),
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy
    });

    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  static async getById(id) {
    const entry = await AuditRepository.findById(id);
    if (!entry) throw ApiError.notFound('Audit entry not found');
    return entry;
  }

  static async timeline(entity, entityId, query) {
    const pagination = utils.pagination.buildPagination(query, { defaultLimit: 50, maxLimit: 200 });

    const { items, total } = await AuditRepository.timeline(entity, entityId, {
      skip: pagination.skip,
      take: pagination.take
    });

    return {
      entity,
      entityId,
      items,
      total,
      page: pagination.page,
      limit: pagination.limit
    };
  }

  /** Everything that happened under one correlation id, across services. */
  static async trace(correlationId) {
    const items = await AuditRepository.correlated(correlationId);
    if (!items.length) throw ApiError.notFound('No audit entries for this correlation id');

    return {
      correlationId,
      spanMs: new Date(items[items.length - 1].occurredAt) - new Date(items[0].occurredAt),
      services: [...new Set(items.map((item) => item.source))],
      steps: items.length,
      items
    };
  }

  /** A user may always read their own activity; others need audit.view. */
  static async userActivity(userId, query, requester) {
    if (userId !== requester.id && !hasPermission(requester.permissions, 'audit.view')) {
      throw ApiError.forbidden('You can only view your own activity');
    }

    return AuditService.list({ ...query, actorId: userId });
  }

  static async stats(query) {
    const where = buildWhere(query);
    const key = CACHE.stats(hashFilters(where));

    return cache.remember(key, config.statsCacheTtl, async () => {
      const [raw, topActors] = await Promise.all([
        AuditRepository.stats(where),
        AuditRepository.topActors(where)
      ]);

      return {
        total: raw.total,
        uniqueActors: raw.uniqueActors,
        byAction: raw.byAction.map((row) => ({ action: row.action, count: row._count._all })),
        bySeverity: raw.bySeverity.map((row) => ({ severity: row.severity, count: row._count._all })),
        topEntities: raw.byEntity.map((row) => ({ entity: row.entity, count: row._count._all })),
        topActors: topActors.map((row) => ({
          actorId: row.actorId,
          actorEmail: row.actorEmail,
          count: row._count._all
        }))
      };
    });
  }

  static async summaries(query) {
    const to = query.dateTo ? new Date(query.dateTo) : new Date();
    const from = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(to.getTime() - 30 * 86400000);

    const rows = await SummaryRepository.range(from, to, query.entity || null);

    return {
      from,
      to,
      entity: query.entity || null,
      days: rows.length,
      rows
    };
  }

  static async deadLetters(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['createdAt'],
      defaultSortField: 'createdAt'
    });

    const where = query.resolved === true
      ? { resolvedAt: { not: null } }
      : query.resolved === false
        ? { resolvedAt: null }
        : {};

    const { items, total } = await DeadLetterRepository.paginate({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy
    });

    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  static async resolveDeadLetter(id) {
    const record = await DeadLetterRepository.paginate({
      where: { id },
      skip: 0,
      take: 1,
      orderBy: { createdAt: 'desc' }
    });
    if (!record.items.length) throw ApiError.notFound('Dead letter not found');

    await DeadLetterRepository.resolve(id);
    return { resolved: true };
  }

  static buildWhere = buildWhere;
}

module.exports = AuditService;
