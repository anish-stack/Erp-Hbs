'use strict';

const Joi = require('joi');
const {
  WAREHOUSE_TYPE,
  WAREHOUSE_STATUS,
  ZONE_TYPE,
  BIN_TYPE,
  BIN_STATUS,
  PUTAWAY_STRATEGY,
  TASK_TYPE,
  TASK_STATUS,
  REF_TYPE
} = require('../constants');

const uuid = Joi.string().uuid();

module.exports = {
  idParam: Joi.object({ id: Joi.string().uuid().required() }),
  zoneParams: Joi.object({ zoneId: Joi.string().uuid().required() }),
  binParams: Joi.object({ binId: Joi.string().uuid().required() }),
  ruleParams: Joi.object({ ruleId: Joi.string().uuid().required() }),
  taskParams: Joi.object({ taskId: Joi.string().uuid().required() }),
  whZoneParams: Joi.object({ id: Joi.string().uuid().required(), zoneId: Joi.string().uuid().required() }),
  whBinParams: Joi.object({ id: Joi.string().uuid().required(), binId: Joi.string().uuid().required() }),
  whRuleParams: Joi.object({ id: Joi.string().uuid().required(), ruleId: Joi.string().uuid().required() }),

  list: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(150).allow(''),
    sortBy: Joi.string().valid('code', 'name', 'createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    status: Joi.string().valid(...Object.values(WAREHOUSE_STATUS)),
    type: Joi.string().valid(...Object.values(WAREHOUSE_TYPE))
  }),

  create: Joi.object({
    code: Joi.string().min(2).max(30).required(),
    name: Joi.string().min(2).max(150).required(),
    type: Joi.string().valid(...Object.values(WAREHOUSE_TYPE)).default('MAIN'),
    addressLine1: Joi.string().max(200).allow('', null),
    addressLine2: Joi.string().max(200).allow('', null),
    city: Joi.string().max(80).allow('', null),
    state: Joi.string().max(80).allow('', null),
    pincode: Joi.string().max(12).allow('', null),
    country: Joi.string().max(80).default('India'),
    contactName: Joi.string().max(120).allow('', null),
    contactPhone: Joi.string().max(30).allow('', null),
    contactEmail: Joi.string().email().max(191).allow('', null),
    gstin: Joi.string().length(15).uppercase().allow('', null),
    isDefault: Joi.boolean().default(false),
    allowNegativeStock: Joi.boolean().default(false),
    mslControlled: Joi.boolean().default(true),
    timezone: Joi.string().max(40).default('Asia/Kolkata'),
    notes: Joi.string().max(1000).allow('', null)
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(150),
    type: Joi.string().valid(...Object.values(WAREHOUSE_TYPE)),
    addressLine1: Joi.string().max(200).allow('', null),
    addressLine2: Joi.string().max(200).allow('', null),
    city: Joi.string().max(80).allow('', null),
    state: Joi.string().max(80).allow('', null),
    pincode: Joi.string().max(12).allow('', null),
    country: Joi.string().max(80),
    contactName: Joi.string().max(120).allow('', null),
    contactPhone: Joi.string().max(30).allow('', null),
    contactEmail: Joi.string().email().max(191).allow('', null),
    gstin: Joi.string().length(15).uppercase().allow('', null),
    isDefault: Joi.boolean(),
    allowNegativeStock: Joi.boolean(),
    mslControlled: Joi.boolean(),
    timezone: Joi.string().max(40),
    notes: Joi.string().max(1000).allow('', null)
  }).min(1),

  zoneCreate: Joi.object({
    code: Joi.string().min(1).max(30).required(),
    name: Joi.string().min(2).max(120).required(),
    type: Joi.string().valid(...Object.values(ZONE_TYPE)).default('STORAGE'),
    temperatureControlled: Joi.boolean().default(false),
    esdProtected: Joi.boolean().default(false),
    isActive: Joi.boolean().default(true)
  }),

  zoneUpdate: Joi.object({
    name: Joi.string().min(2).max(120),
    type: Joi.string().valid(...Object.values(ZONE_TYPE)),
    temperatureControlled: Joi.boolean(),
    esdProtected: Joi.boolean(),
    isActive: Joi.boolean()
  }).min(1),

  binList: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(60).allow(''),
    sortBy: Joi.string().valid('code', 'currentUnits', 'createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    zoneId: uuid,
    status: Joi.string().valid(...Object.values(BIN_STATUS)),
    binType: Joi.string().valid(...Object.values(BIN_TYPE)),
    isPickable: Joi.boolean()
  }),

  binCreate: Joi.object({
    zoneId: uuid.allow(null),
    code: Joi.string().min(1).max(40).required(),
    aisle: Joi.string().max(20).allow('', null),
    rack: Joi.string().max(20).allow('', null),
    shelf: Joi.string().max(20).allow('', null),
    level: Joi.string().max(20).allow('', null),
    binType: Joi.string().valid(...Object.values(BIN_TYPE)).default('SHELF'),
    status: Joi.string().valid(...Object.values(BIN_STATUS)).default('AVAILABLE'),
    maxUnits: Joi.number().integer().min(0).allow(null),
    maxWeightKg: Joi.number().min(0).precision(3).allow(null),
    isPickable: Joi.boolean().default(true),
    isBulk: Joi.boolean().default(false),
    mslZone: Joi.boolean().default(false),
    notes: Joi.string().max(500).allow('', null)
  }),

  binBulk: Joi.object({
    zoneId: uuid.allow(null),
    prefix: Joi.string().max(20).allow(''),
    aisles: Joi.array().items(Joi.string().max(10)).min(1).required(),
    racks: Joi.number().integer().min(1).max(200).default(1),
    shelves: Joi.number().integer().min(1).max(50).default(1),
    levels: Joi.number().integer().min(1).max(20).default(1),
    binType: Joi.string().valid(...Object.values(BIN_TYPE)).default('SHELF'),
    maxUnits: Joi.number().integer().min(0).allow(null),
    isPickable: Joi.boolean().default(true),
    mslZone: Joi.boolean().default(false)
  }),

  binUpdate: Joi.object({
    zoneId: uuid.allow(null),
    aisle: Joi.string().max(20).allow('', null),
    rack: Joi.string().max(20).allow('', null),
    shelf: Joi.string().max(20).allow('', null),
    level: Joi.string().max(20).allow('', null),
    binType: Joi.string().valid(...Object.values(BIN_TYPE)),
    status: Joi.string().valid(...Object.values(BIN_STATUS)),
    maxUnits: Joi.number().integer().min(0).allow(null),
    maxWeightKg: Joi.number().min(0).precision(3).allow(null),
    isPickable: Joi.boolean(),
    isBulk: Joi.boolean(),
    mslZone: Joi.boolean(),
    notes: Joi.string().max(500).allow('', null)
  }).min(1),

  binSuggest: Joi.object({
    zoneId: uuid,
    mslZone: Joi.boolean(),
    needUnits: Joi.number().integer().min(0)
  }),

  ruleCreate: Joi.object({
    name: Joi.string().min(2).max(120).required(),
    categoryId: uuid.allow(null),
    partId: uuid.allow(null),
    strategy: Joi.string().valid(...Object.values(PUTAWAY_STRATEGY)).default('NEAREST'),
    targetZoneType: Joi.string().valid(...Object.values(ZONE_TYPE)).allow(null),
    targetZoneId: uuid.allow(null),
    requiresMsl: Joi.boolean().default(false),
    priority: Joi.number().integer().min(1).max(1000).default(100),
    isActive: Joi.boolean().default(true)
  }),

  ruleUpdate: Joi.object({
    name: Joi.string().min(2).max(120),
    categoryId: uuid.allow(null),
    partId: uuid.allow(null),
    strategy: Joi.string().valid(...Object.values(PUTAWAY_STRATEGY)),
    targetZoneType: Joi.string().valid(...Object.values(ZONE_TYPE)).allow(null),
    targetZoneId: uuid.allow(null),
    requiresMsl: Joi.boolean(),
    priority: Joi.number().integer().min(1).max(1000),
    isActive: Joi.boolean()
  }).min(1),

  putawaySuggest: Joi.object({
    partId: uuid,
    categoryId: uuid,
    needUnits: Joi.number().integer().min(0),
    mslRequired: Joi.boolean()
  }),

  taskList: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sortBy: Joi.string().valid('createdAt', 'priority', 'code'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    warehouseId: uuid,
    type: Joi.string().valid(...Object.values(TASK_TYPE)),
    status: Joi.string().valid(...Object.values(TASK_STATUS)),
    assignedTo: uuid,
    refType: Joi.string().max(30),
    refId: uuid
  }),

  taskCreate: Joi.object({
    warehouseId: uuid.required(),
    type: Joi.string().valid(...Object.values(TASK_TYPE)).required(),
    partId: uuid.required(),
    partCode: Joi.string().max(60).allow('', null),
    categoryId: uuid.allow(null),
    quantity: Joi.number().positive().precision(3).required(),
    uom: Joi.string().max(12).default('PCS'),
    fromBinId: uuid.allow(null),
    fromBinCode: Joi.string().max(40).allow('', null),
    toBinId: uuid.allow(null),
    toBinCode: Joi.string().max(40).allow('', null),
    mslRequired: Joi.boolean().allow(null),
    refType: Joi.string().valid(...Object.values(REF_TYPE)).default('MANUAL'),
    refId: uuid.allow(null),
    refCode: Joi.string().max(40).allow('', null),
    priority: Joi.number().integer().min(1).max(1000).default(100),
    assignedTo: uuid.allow(null),
    note: Joi.string().max(500).allow('', null)
  }),

  taskAssign: Joi.object({ assignedTo: uuid.required() }),
  taskComplete: Joi.object({
    toBinId: uuid.allow(null),
    toBinCode: Joi.string().max(40).allow('', null)
  }),

  reason: Joi.object({ reason: Joi.string().min(3).max(255).required() }),
  reasonOptional: Joi.object({ reason: Joi.string().max(255).allow('', null) })
};
