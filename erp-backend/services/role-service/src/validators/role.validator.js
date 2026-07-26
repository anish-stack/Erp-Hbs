'use strict';

const Joi = require('joi');

const code = Joi.string()
  .pattern(/^[A-Za-z][A-Za-z0-9_\s]{1,49}$/)
  .messages({ 'string.pattern.base': 'Code must start with a letter and contain only letters, numbers, spaces or underscores' });

const permissionSelection = {
  permissionIds: Joi.array().items(Joi.string().uuid()).default([]),
  permissionCodes: Joi.array().items(Joi.string().max(100)).default([])
};

module.exports = {
  list: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(150).allow(''),
    sortBy: Joi.string().valid('code', 'name', 'createdAt', 'updatedAt'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    isActive: Joi.boolean(),
    isSystem: Joi.boolean()
  }),

  idParam: Joi.object({ id: Joi.string().uuid().required() }),

  create: Joi.object({
    code: code.required(),
    name: Joi.string().min(2).max(150).required(),
    description: Joi.string().max(500).allow('', null),
    landingPath: Joi.string().max(150).pattern(/^\//).default('/dashboard'),
    isActive: Joi.boolean().default(true),
    ...permissionSelection
  }),

  update: Joi.object({
    code,
    name: Joi.string().min(2).max(150),
    description: Joi.string().max(500).allow('', null),
    landingPath: Joi.string().max(150).pattern(/^\//),
    isActive: Joi.boolean()
  }).min(1),

  clone: Joi.object({
    code: code.required(),
    name: Joi.string().min(2).max(150).required(),
    description: Joi.string().max(500).allow('', null),
    landingPath: Joi.string().max(150).pattern(/^\//)
  }),

  // PUT replaces the whole set, so an empty list is a valid "revoke everything".
  permissionsReplace: Joi.object(permissionSelection),

  // POST/DELETE mutate the set, so at least one permission is mandatory.
  permissionsMutate: Joi.object(permissionSelection).custom((value, helpers) => {
    const total = (value.permissionIds || []).length + (value.permissionCodes || []).length;
    if (!total) return helpers.error('any.invalid');
    return value;
  }, 'non-empty permission selection').messages({
    'any.invalid': 'Provide at least one permissionId or permissionCode'
  }),

  permissionList: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(150).allow(''),
    module: Joi.string().max(50),
    action: Joi.string().max(50),
    sortBy: Joi.string().valid('code', 'module', 'action', 'createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc')
  })
};
