'use strict';

const Joi = require('joi');
const { LIFECYCLE, MOUNTING, ALTERNATE_TYPE } = require('../constants');

const partNumberRule = Joi.string().min(2).max(120).pattern(/^[A-Za-z0-9][A-Za-z0-9\s\-_./+#]*$/).messages({
  'string.pattern.base': 'Part number contains unsupported characters'
});

module.exports = {
  idParam: Joi.object({ id: Joi.string().uuid().required() }),

  alternateParams: Joi.object({
    id: Joi.string().uuid().required(),
    alternateId: Joi.string().uuid().required()
  }),

  list: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(150).allow(''),
    sortBy: Joi.string().valid('partNumber', 'createdAt', 'updatedAt', 'lifecycle'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    manufacturerId: Joi.string().uuid(),
    categoryId: Joi.string().uuid(),
    categoryPath: Joi.string().max(500),
    lifecycle: Joi.string().valid(...Object.values(LIFECYCLE)),
    mountingType: Joi.string().valid(...Object.values(MOUNTING)),
    isActive: Joi.boolean(),
    rohsCompliant: Joi.boolean(),
    hsnCode: Joi.string().max(20)
  }),

  search: Joi.object({
    search: Joi.string().min(2).max(120).required(),
    limit: Joi.number().integer().min(1).max(50),
    categoryPath: Joi.string().max(500)
  }),

  create: Joi.object({
    partNumber: partNumberRule.required(),
    internalCode: Joi.string().max(60).allow('', null),
    manufacturerId: Joi.string().uuid().required(),
    categoryId: Joi.string().uuid().required(),
    uomId: Joi.string().uuid().required(),
    taxRateId: Joi.string().uuid().allow(null),
    currencyId: Joi.string().uuid().allow(null),
    description: Joi.string().min(3).max(500).required(),
    longDescription: Joi.string().max(2000).allow('', null),
    packageType: Joi.string().max(60).allow('', null),
    mountingType: Joi.string().valid(...Object.values(MOUNTING)).default('UNKNOWN'),
    lifecycle: Joi.string().valid(...Object.values(LIFECYCLE)).default('ACTIVE'),
    rohsCompliant: Joi.boolean().default(true),
    reachCompliant: Joi.boolean().default(true),
    countryOfOrigin: Joi.string().max(80).allow('', null),
    hsnCode: Joi.string().max(20).allow('', null),
    specifications: Joi.object().allow(null),
    datasheetFileId: Joi.string().uuid().allow(null),
    imageFileId: Joi.string().uuid().allow(null),
    moq: Joi.number().integer().min(1).default(1),
    packQuantity: Joi.number().integer().min(1).default(1),
    leadTimeDays: Joi.number().integer().min(0).max(999).allow(null),
    minStock: Joi.number().integer().min(0).default(0),
    maxStock: Joi.number().integer().min(0).allow(null),
    reorderPoint: Joi.number().integer().min(0).default(0),
    shelfLifeDays: Joi.number().integer().min(0).allow(null),
    standardCost: Joi.number().min(0).allow(null),
    listPrice: Joi.number().min(0).allow(null),
    isActive: Joi.boolean().default(true),
    isSerialised: Joi.boolean().default(false),
    isBatchTracked: Joi.boolean().default(false)
  }),

  update: Joi.object({
    partNumber: partNumberRule,
    internalCode: Joi.string().max(60).allow('', null),
    manufacturerId: Joi.string().uuid(),
    categoryId: Joi.string().uuid(),
    uomId: Joi.string().uuid(),
    taxRateId: Joi.string().uuid().allow(null),
    currencyId: Joi.string().uuid().allow(null),
    description: Joi.string().min(3).max(500),
    longDescription: Joi.string().max(2000).allow('', null),
    packageType: Joi.string().max(60).allow('', null),
    mountingType: Joi.string().valid(...Object.values(MOUNTING)),
    lifecycle: Joi.string().valid(...Object.values(LIFECYCLE)),
    rohsCompliant: Joi.boolean(),
    reachCompliant: Joi.boolean(),
    countryOfOrigin: Joi.string().max(80).allow('', null),
    hsnCode: Joi.string().max(20).allow('', null),
    specifications: Joi.object().allow(null),
    datasheetFileId: Joi.string().uuid().allow(null),
    imageFileId: Joi.string().uuid().allow(null),
    moq: Joi.number().integer().min(1),
    packQuantity: Joi.number().integer().min(1),
    leadTimeDays: Joi.number().integer().min(0).max(999).allow(null),
    minStock: Joi.number().integer().min(0),
    maxStock: Joi.number().integer().min(0).allow(null),
    reorderPoint: Joi.number().integer().min(0),
    shelfLifeDays: Joi.number().integer().min(0).allow(null),
    standardCost: Joi.number().min(0).allow(null),
    lastPurchasePrice: Joi.number().min(0).allow(null),
    listPrice: Joi.number().min(0).allow(null),
    isActive: Joi.boolean(),
    isSerialised: Joi.boolean(),
    isBatchTracked: Joi.boolean()
  }).min(1),

  addAlternate: Joi.object({
    alternateId: Joi.string().uuid().required(),
    type: Joi.string().valid(...Object.values(ALTERNATE_TYPE)).default('FUNCTIONAL'),
    notes: Joi.string().max(500).allow('', null),
    bidirectional: Joi.boolean().default(true)
  })
};
