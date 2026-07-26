'use strict';

const Joi = require('joi');
const { AUDIT_ACTION, AUDIT_SEVERITY, AUDIT_CHANNEL } = require('../constants');

const filters = {
  entity: Joi.string().max(60),
  entityId: Joi.string().max(60),
  action: Joi.string().valid(...Object.values(AUDIT_ACTION)),
  severity: Joi.string().valid(...Object.values(AUDIT_SEVERITY)),
  channel: Joi.string().valid(...Object.values(AUDIT_CHANNEL)),
  actorId: Joi.string().uuid(),
  source: Joi.string().max(50),
  event: Joi.string().max(100),
  correlationId: Joi.string().uuid(),
  search: Joi.string().max(150).allow(''),
  dateFrom: Joi.date(),
  dateTo: Joi.date()
};

module.exports = {
  list: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sortBy: Joi.string().valid('occurredAt', 'createdAt', 'entity', 'action', 'severity'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    ...filters
  }),

  idParam: Joi.object({ id: Joi.string().uuid().required() }),

  timelineParams: Joi.object({
    entity: Joi.string().max(60).required(),
    entityId: Joi.string().max(60).required()
  }),

  traceParam: Joi.object({ correlationId: Joi.string().uuid().required() }),

  userParam: Joi.object({ userId: Joi.string().uuid().required() }),

  exportParam: Joi.object({ exportJobId: Joi.string().uuid().required() }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(200)
  }),

  stats: Joi.object(filters),

  summaries: Joi.object({
    entity: Joi.string().max(60),
    dateFrom: Joi.date(),
    dateTo: Joi.date()
  }),

  exportRequest: Joi.object(filters),

  deadLetters: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    resolved: Joi.boolean(),
    sortOrder: Joi.string().valid('asc', 'desc')
  }),

  ingest: Joi.object({
    event: Joi.string().max(100).required(),
    entity: Joi.string().max(60).required(),
    entityId: Joi.string().max(60).allow(null, ''),
    action: Joi.string().valid(...Object.values(AUDIT_ACTION)),
    severity: Joi.string().valid(...Object.values(AUDIT_SEVERITY)),
    summary: Joi.string().max(500).allow('', null),
    source: Joi.string().max(50),
    eventId: Joi.string().uuid(),
    correlationId: Joi.string().uuid().allow(null),
    actorId: Joi.string().uuid().allow(null),
    actorEmail: Joi.string().email().allow(null, ''),
    changes: Joi.array().items(Joi.string().max(60)),
    data: Joi.object().default({}),
    occurredAt: Joi.date()
  })
};
