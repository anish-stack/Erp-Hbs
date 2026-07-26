'use strict';

const Joi = require('joi');
const { MENU_TYPE } = require('../constants');

const types = Object.values(MENU_TYPE);

module.exports = {
  list: Joi.object({
    type: Joi.string().valid(...types)
  }),

  idParam: Joi.object({ id: Joi.string().uuid().required() }),

  roleParam: Joi.object({ roleId: Joi.string().uuid().required() }),

  create: Joi.object({
    code: Joi.string().pattern(/^[a-z0-9._-]{2,80}$/).required()
      .messages({ 'string.pattern.base': 'Code must be lowercase alphanumeric with . _ - separators' }),
    label: Joi.string().min(2).max(120).required(),
    icon: Joi.string().max(80).allow('', null),
    path: Joi.string().max(191).pattern(/^\//).allow('', null),
    type: Joi.string().valid(...types).default(MENU_TYPE.SIDEBAR),
    module: Joi.string().max(50).allow('', null),
    permissionCode: Joi.string().max(100).allow('', null),
    badgeKey: Joi.string().max(80).allow('', null),
    parentId: Joi.string().uuid().allow(null),
    sortOrder: Joi.number().integer().min(0).max(9999).default(0),
    isActive: Joi.boolean().default(true),
    meta: Joi.object().allow(null)
  }),

  update: Joi.object({
    label: Joi.string().min(2).max(120),
    icon: Joi.string().max(80).allow('', null),
    path: Joi.string().max(191).pattern(/^\//).allow('', null),
    module: Joi.string().max(50).allow('', null),
    permissionCode: Joi.string().max(100).allow('', null),
    badgeKey: Joi.string().max(80).allow('', null),
    parentId: Joi.string().uuid().allow(null),
    sortOrder: Joi.number().integer().min(0).max(9999),
    isActive: Joi.boolean(),
    meta: Joi.object().allow(null)
  }).min(1),

  reorder: Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().uuid().required(),
          sortOrder: Joi.number().integer().min(0).max(9999).required(),
          parentId: Joi.string().uuid().allow(null)
        })
      )
      .min(1)
      .required()
  }),

  assignRoleMenus: Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          menuId: Joi.string().uuid().required(),
          sortOrder: Joi.number().integer().min(0).max(9999).allow(null),
          isVisible: Joi.boolean().default(true)
        })
      )
      .required()
  })
};
