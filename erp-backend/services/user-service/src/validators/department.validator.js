'use strict';

const Joi = require('joi');

module.exports = {
  list: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(150).allow(''),
    isActive: Joi.boolean(),
    sortBy: Joi.string().valid('code', 'name', 'createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc')
  }),

  idParam: Joi.object({ id: Joi.string().uuid().required() }),

  create: Joi.object({
    code: Joi.string().pattern(/^[A-Za-z][A-Za-z0-9_]{1,49}$/).required()
      .messages({ 'string.pattern.base': 'Code must start with a letter (letters, numbers, underscore)' }),
    name: Joi.string().min(2).max(150).required(),
    description: Joi.string().max(500).allow('', null),
    headUserId: Joi.string().uuid().allow(null),
    isActive: Joi.boolean().default(true)
  }),

  update: Joi.object({
    code: Joi.string().pattern(/^[A-Za-z][A-Za-z0-9_]{1,49}$/),
    name: Joi.string().min(2).max(150),
    description: Joi.string().max(500).allow('', null),
    headUserId: Joi.string().uuid().allow(null),
    isActive: Joi.boolean()
  }).min(1)
};
