'use strict';

const Joi = require('joi');
const {
  MOVEMENT_TYPE,
  RESERVATION_STATUS,
  ADJUSTMENT_TYPE,
  ADJUSTMENT_STATUS,
  LOT_STATUS,
  REF_TYPE
} = require('../constants');

const uuid = Joi.string().uuid();
const qty = Joi.number().positive().precision(3);

module.exports = {
  idParam: Joi.object({ id: Joi.string().uuid().required() }),
  partParam: Joi.object({ partId: Joi.string().uuid().required() }),

  stockList: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(150).allow(''),
    sortBy: Joi.string().valid('available', 'onHand', 'totalValue', 'lastMovementAt', 'createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    warehouseId: uuid,
    partId: uuid,
    hasStock: Joi.boolean(),
    belowReorder: Joi.boolean(),
    isActive: Joi.boolean()
  }),

  availability: Joi.object({
    partId: uuid.required(),
    warehouseId: uuid,
    quantity: Joi.number().min(0).precision(3)
  }),

  receipt: Joi.object({
    partId: uuid.required(),
    warehouseId: uuid,
    binLocation: Joi.string().max(40).default('DEFAULT'),
    quantity: qty.required(),
    unitCost: Joi.number().min(0).precision(4).default(0),
    currencyCode: Joi.string().length(3).uppercase().default('INR'),
    lotNumber: Joi.string().max(60).allow('', null),
    dateCode: Joi.string().max(20).allow('', null),
    mslLevel: Joi.string().max(8).allow('', null),
    serialFrom: Joi.string().max(60).allow('', null),
    serialTo: Joi.string().max(60).allow('', null),
    quarantine: Joi.boolean().default(false),
    supplierId: uuid.allow(null),
    mfgDate: Joi.date().iso().allow(null),
    expiryDate: Joi.date().iso().allow(null),
    refType: Joi.string().valid(...Object.values(REF_TYPE)).default(REF_TYPE.MANUAL),
    refId: uuid.allow(null),
    refCode: Joi.string().max(40).allow('', null),
    reason: Joi.string().max(255).allow('', null)
  }),

  issue: Joi.object({
    partId: uuid.required(),
    warehouseId: uuid,
    binLocation: Joi.string().max(40).default('DEFAULT'),
    quantity: qty.required(),
    allowNegative: Joi.boolean().default(false),
    refType: Joi.string().valid(...Object.values(REF_TYPE)).default(REF_TYPE.MANUAL),
    refId: uuid.allow(null),
    refCode: Joi.string().max(40).allow('', null),
    reason: Joi.string().max(255).allow('', null)
  }),

  transfer: Joi.object({
    partId: uuid.required(),
    fromWarehouseId: uuid,
    toWarehouseId: uuid.required(),
    fromBin: Joi.string().max(40).default('DEFAULT'),
    toBin: Joi.string().max(40).default('DEFAULT'),
    quantity: qty.required(),
    refCode: Joi.string().max(40).allow('', null),
    reason: Joi.string().max(255).allow('', null)
  }),

  reorder: Joi.object({
    minLevel: Joi.number().min(0).precision(3),
    reorderPoint: Joi.number().min(0).precision(3),
    reorderQty: Joi.number().min(0).precision(3),
    maxLevel: Joi.number().min(0).precision(3).allow(null)
  }).min(1),

  reserve: Joi.object({
    partId: uuid.required(),
    warehouseId: uuid,
    binLocation: Joi.string().max(40).default('DEFAULT'),
    quantity: qty.required(),
    refType: Joi.string().valid(...Object.values(REF_TYPE)).default(REF_TYPE.SALES_ORDER),
    refId: uuid.required(),
    refCode: Joi.string().max(40).allow('', null),
    reason: Joi.string().max(255).allow('', null),
    expiresAt: Joi.date().iso().allow(null)
  }),

  fulfill: Joi.object({
    quantity: Joi.number().positive().precision(3),
    refCode: Joi.string().max(40).allow('', null)
  }),

  reservationList: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sortBy: Joi.string().valid('createdAt', 'expiresAt'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    status: Joi.string().valid(...Object.values(RESERVATION_STATUS)),
    partId: uuid,
    warehouseId: uuid,
    refType: Joi.string().max(30),
    refId: uuid
  }),

  movementList: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sortBy: Joi.string().valid('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    stockItemId: uuid,
    partId: uuid,
    warehouseId: uuid,
    type: Joi.string().valid(...Object.values(MOVEMENT_TYPE)),
    refType: Joi.string().max(30),
    refId: uuid,
    from: Joi.date().iso(),
    to: Joi.date().iso()
  }),

  lotList: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sortBy: Joi.string().valid('receivedAt', 'expiryDate'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    partId: uuid,
    warehouseId: uuid,
    supplierId: uuid,
    status: Joi.string().valid(...Object.values(LOT_STATUS)),
    lotNumber: Joi.string().max(60)
  }),

  adjustmentList: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sortBy: Joi.string().valid('createdAt', 'code'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    status: Joi.string().valid(...Object.values(ADJUSTMENT_STATUS)),
    type: Joi.string().valid(...Object.values(ADJUSTMENT_TYPE)),
    warehouseId: uuid
  }),

  adjustmentCreate: Joi.object({
    warehouseId: uuid,
    type: Joi.string().valid(...Object.values(ADJUSTMENT_TYPE)).default('CYCLE_COUNT'),
    reason: Joi.string().max(255).allow('', null),
    lines: Joi.array()
      .items(
        Joi.object({
          partId: uuid.required(),
          partCode: Joi.string().max(60).allow('', null),
          binLocation: Joi.string().max(40).default('DEFAULT'),
          countedQty: Joi.number().min(0).precision(3).required(),
          unitCost: Joi.number().min(0).precision(4),
          note: Joi.string().max(255).allow('', null)
        })
      )
      .min(1)
      .required()
  }),

  adjustmentUpdate: Joi.object({
    type: Joi.string().valid(...Object.values(ADJUSTMENT_TYPE)),
    reason: Joi.string().max(255).allow('', null),
    lines: Joi.array().items(
      Joi.object({
        partId: uuid.required(),
        partCode: Joi.string().max(60).allow('', null),
        binLocation: Joi.string().max(40).default('DEFAULT'),
        countedQty: Joi.number().min(0).precision(3).required(),
        unitCost: Joi.number().min(0).precision(4),
        note: Joi.string().max(255).allow('', null)
      })
    )
  }).min(1),

  reason: Joi.object({ reason: Joi.string().min(3).max(255).required() })
};
