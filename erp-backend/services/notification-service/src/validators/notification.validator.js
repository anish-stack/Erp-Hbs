'use strict';
const Joi = require('joi');
const { NOTIFICATION_CATEGORY, DELIVERY_CHANNEL } = require('../constants');
const uuid = Joi.string().uuid();

module.exports = {
  idParam: Joi.object({ id: Joi.string().uuid().required() }),

  list: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    read: Joi.boolean(),
    category: Joi.string().valid(...Object.values(NOTIFICATION_CATEGORY)),
    type: Joi.string().max(60)
  }),

  create: Joi.object({
    recipientId: uuid.allow(null),
    audienceRole: Joi.string().max(60).allow(null),
    type: Joi.string().max(60).required(),
    category: Joi.string().valid(...Object.values(NOTIFICATION_CATEGORY)).default('SYSTEM'),
    priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'CRITICAL').default('NORMAL'),
    title: Joi.string().max(200).required(),
    message: Joi.string().max(1000).required(),
    data: Joi.object().unknown(true).default({}),
    channels: Joi.array().items(Joi.string().valid(...Object.values(DELIVERY_CHANNEL))).min(1).default(['IN_APP']),
    recipientContact: Joi.object({ email: Joi.string().email().allow(null), phone: Joi.string().allow(null) })
  }).or('recipientId', 'audienceRole').messages({ 'object.missing': 'Provide recipientId or audienceRole (or neither for a broadcast)' }),

  preferenceUpdate: Joi.object({
    emailEnabled: Joi.boolean(),
    smsEnabled: Joi.boolean(),
    inAppEnabled: Joi.boolean(),
    mutedTypes: Joi.array().items(Joi.string().max(60)),
    email: Joi.string().email().allow('', null),
    phone: Joi.string().max(20).allow('', null)
  }).min(1)
};
