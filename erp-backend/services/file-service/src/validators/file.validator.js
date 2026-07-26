'use strict';

const Joi = require('joi');
const { FILE_CATEGORY, VISIBILITY } = require('../constants');

module.exports = {
  upload: Joi.object({
    category: Joi.string().valid(...Object.values(FILE_CATEGORY)).default(FILE_CATEGORY.OTHER),
    visibility: Joi.string().valid(...Object.values(VISIBILITY)).default(VISIBILITY.PRIVATE),
    entity: Joi.string().max(60).allow('', null),
    entityId: Joi.string().max(60).allow('', null),
    tag: Joi.string().max(60).allow('', null),
    deduplicate: Joi.boolean().default(true),
    metadata: Joi.object().allow(null)
  }),

  list: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(150).allow(''),
    sortBy: Joi.string().valid('createdAt', 'sizeBytes', 'originalName', 'downloadCount'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    entity: Joi.string().max(60),
    entityId: Joi.string().max(60),
    category: Joi.string().valid(...Object.values(FILE_CATEGORY)),
    visibility: Joi.string().valid(...Object.values(VISIBILITY)),
    tag: Joi.string().max(60),
    mimeType: Joi.string().max(150)
  }),

  idParam: Joi.object({ id: Joi.string().uuid().required() }),

  entityParams: Joi.object({
    entity: Joi.string().max(60).required(),
    entityId: Joi.string().max(60).required()
  }),

  attach: Joi.object({
    entity: Joi.string().max(60).required(),
    entityId: Joi.string().max(60).required(),
    tag: Joi.string().max(60).allow('', null)
  }),

  signedUrl: Joi.object({
    ttlSeconds: Joi.number().integer().min(30).max(86400)
  }),

  share: Joi.object({
    expiresInMinutes: Joi.number().integer().min(5).max(43200).default(1440),
    maxUses: Joi.number().integer().min(1).max(1000).allow(null),
    note: Joi.string().max(255).allow('', null)
  }),

  shareParams: Joi.object({
    id: Joi.string().uuid().required(),
    shareId: Joi.string().uuid().required()
  }),

  tokenParam: Joi.object({ token: Joi.string().length(64).required() }),

  rawQuery: Joi.object({
    expires: Joi.number().integer().required(),
    signature: Joi.string().length(64).required()
  })
};
