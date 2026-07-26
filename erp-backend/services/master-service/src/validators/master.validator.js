'use strict';

const Joi = require('joi');
const { LIFECYCLE, MOUNTING, ALTERNATE_TYPE, SETTING_TYPE, RESET_POLICY } = require('../constants');

const code = Joi.string().pattern(/^[A-Za-z][A-Za-z0-9_-]{1,49}$/).messages({
  'string.pattern.base': 'Code must start with a letter (letters, numbers, - and _ allowed)'
});

const listBase = {
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  search: Joi.string().max(150).allow(''),
  sortOrder: Joi.string().valid('asc', 'desc')
};

module.exports = {
  idParam: Joi.object({ id: Joi.string().uuid().required() }),

  manufacturerList: Joi.object({
    ...listBase,
    sortBy: Joi.string().valid('code', 'name', 'createdAt'),
    isActive: Joi.boolean(),
    isApproved: Joi.boolean(),
    country: Joi.string().max(80)
  }),

  manufacturerCreate: Joi.object({
    code: code.required(),
    name: Joi.string().min(2).max(180).required(),
    aliases: Joi.array().items(Joi.string().max(120)).max(20),
    country: Joi.string().max(80).allow('', null),
    website: Joi.string().uri().max(255).allow('', null),
    logoFileId: Joi.string().uuid().allow(null),
    description: Joi.string().max(1000).allow('', null),
    isApproved: Joi.boolean().default(true),
    isActive: Joi.boolean().default(true)
  }),

  manufacturerUpdate: Joi.object({
    code,
    name: Joi.string().min(2).max(180),
    aliases: Joi.array().items(Joi.string().max(120)).max(20),
    country: Joi.string().max(80).allow('', null),
    website: Joi.string().uri().max(255).allow('', null),
    logoFileId: Joi.string().uuid().allow(null),
    description: Joi.string().max(1000).allow('', null),
    isApproved: Joi.boolean(),
    isActive: Joi.boolean()
  }).min(1),

  categoryList: Joi.object({
    ...listBase,
    sortBy: Joi.string().valid('code', 'name', 'level', 'sortOrder', 'createdAt'),
    isActive: Joi.boolean(),
    parentId: Joi.string().uuid(),
    level: Joi.number().integer().min(0).max(10)
  }),

  categoryCreate: Joi.object({
    code: code.required(),
    name: Joi.string().min(2).max(150).required(),
    description: Joi.string().max(500).allow('', null),
    parentId: Joi.string().uuid().allow(null),
    sortOrder: Joi.number().integer().min(0).max(9999).default(0),
    iconKey: Joi.string().max(60).allow('', null),
    isActive: Joi.boolean().default(true)
  }),

  categoryUpdate: Joi.object({
    code,
    name: Joi.string().min(2).max(150),
    description: Joi.string().max(500).allow('', null),
    parentId: Joi.string().uuid().allow(null),
    sortOrder: Joi.number().integer().min(0).max(9999),
    iconKey: Joi.string().max(60).allow('', null),
    isActive: Joi.boolean()
  }).min(1),

  uomCreate: Joi.object({
    code: Joi.string().max(20).required(),
    name: Joi.string().max(80).required(),
    decimals: Joi.number().integer().min(0).max(6).default(0),
    isBase: Joi.boolean().default(false),
    baseUomId: Joi.string().uuid().allow(null),
    conversion: Joi.number().positive().default(1),
    isActive: Joi.boolean().default(true)
  }),

  uomUpdate: Joi.object({
    name: Joi.string().max(80),
    decimals: Joi.number().integer().min(0).max(6),
    baseUomId: Joi.string().uuid().allow(null),
    conversion: Joi.number().positive(),
    isActive: Joi.boolean()
  }).min(1),

  uomConvert: Joi.object({
    fromUomId: Joi.string().uuid().required(),
    toUomId: Joi.string().uuid().required(),
    quantity: Joi.number().positive().required()
  }),

  currencyCreate: Joi.object({
    code: Joi.string().length(3).uppercase().required(),
    name: Joi.string().max(80).required(),
    symbol: Joi.string().max(8).required(),
    decimals: Joi.number().integer().min(0).max(6).default(2),
    isBase: Joi.boolean().default(false),
    exchangeRate: Joi.number().positive().default(1),
    isActive: Joi.boolean().default(true)
  }),

  currencyRate: Joi.object({ exchangeRate: Joi.number().positive().required() }),

  currencyConvert: Joi.object({
    amount: Joi.number().required(),
    fromCode: Joi.string().length(3).required(),
    toCode: Joi.string().length(3).required()
  }),

  taxCreate: Joi.object({
    code: Joi.string().max(40).required(),
    name: Joi.string().max(120).required(),
    hsnCode: Joi.string().max(20).allow('', null),
    ratePercent: Joi.number().min(0).max(100).required(),
    cgstPercent: Joi.number().min(0).max(100),
    sgstPercent: Joi.number().min(0).max(100),
    igstPercent: Joi.number().min(0).max(100),
    cessPercent: Joi.number().min(0).max(100).default(0),
    effectiveFrom: Joi.date(),
    effectiveTo: Joi.date().allow(null),
    isActive: Joi.boolean().default(true)
  }),

  taxCompute: Joi.object({
    taxRateId: Joi.string().uuid().required(),
    amount: Joi.number().positive().required(),
    interState: Joi.boolean().default(false)
  }),

  settingKey: Joi.object({ key: Joi.string().max(100).required() }),

  settingUpdate: Joi.object({ value: Joi.any().required() }),

  settingBulk: Joi.object({
    entries: Joi.array()
      .items(Joi.object({ key: Joi.string().max(100).required(), value: Joi.any().required() }))
      .min(1)
      .required()
  }),

  settingDefine: Joi.object({
    key: Joi.string().max(100).required(),
    groupName: Joi.string().max(60).required(),
    label: Joi.string().max(150).required(),
    value: Joi.any().required(),
    dataType: Joi.string().valid(...Object.values(SETTING_TYPE)).default(SETTING_TYPE.STRING),
    description: Joi.string().max(500).allow('', null),
    isPublic: Joi.boolean().default(false),
    isEditable: Joi.boolean().default(true)
  }),

  sequenceKey: Joi.object({ key: Joi.string().max(60).required() }),

  sequenceNext: Joi.object({ count: Joi.number().integer().min(1).max(100).default(1) }),

  sequenceCreate: Joi.object({
    key: Joi.string().max(60).uppercase().required(),
    name: Joi.string().max(150).required(),
    prefix: Joi.string().max(20).required(),
    suffix: Joi.string().max(20).allow('', null),
    padding: Joi.number().integer().min(1).max(12).default(4),
    nextValue: Joi.number().integer().min(1).default(1),
    step: Joi.number().integer().min(1).max(100).default(1),
    resetPolicy: Joi.string().valid(...Object.values(RESET_POLICY)).default('YEARLY'),
    separator: Joi.string().max(3).default('-'),
    includeYear: Joi.boolean().default(true),
    includeMonth: Joi.boolean().default(false),
    isActive: Joi.boolean().default(true)
  }),

  sequenceUpdate: Joi.object({
    name: Joi.string().max(150),
    prefix: Joi.string().max(20),
    suffix: Joi.string().max(20).allow('', null),
    padding: Joi.number().integer().min(1).max(12),
    nextValue: Joi.number().integer().min(1),
    step: Joi.number().integer().min(1).max(100),
    resetPolicy: Joi.string().valid(...Object.values(RESET_POLICY)),
    separator: Joi.string().max(3),
    includeYear: Joi.boolean(),
    includeMonth: Joi.boolean(),
    isActive: Joi.boolean()
  }).min(1),

  LIFECYCLE_VALUES: Object.values(LIFECYCLE),
  MOUNTING_VALUES: Object.values(MOUNTING),
  ALTERNATE_VALUES: Object.values(ALTERNATE_TYPE)
};
