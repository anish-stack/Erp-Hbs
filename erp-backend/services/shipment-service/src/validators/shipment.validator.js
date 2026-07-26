'use strict';
const Joi = require('joi');
const { SHIPMENT_STATUS } = require('../constants');
const uuid = Joi.string().uuid();

const line = Joi.object({
  orderLineId: uuid.allow(null),
  partId: uuid.required(),
  partCode: Joi.string().max(60).allow('', null),
  description: Joi.string().max(255).allow('', null),
  quantity: Joi.number().positive().precision(3).required(),
  reservationId: uuid.allow(null)
});

module.exports = {
  idParam: Joi.object({ id: Joi.string().uuid().required() }),

  list: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(60).allow(''),
    sortBy: Joi.string().valid('createdAt', 'code', 'dispatchedAt'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    status: Joi.string().valid(...Object.values(SHIPMENT_STATUS)),
    orderId: uuid, customerId: uuid, warehouseId: uuid
  }),

  create: Joi.object({
    orderId: uuid.required(),
    orderCode: Joi.string().max(40).allow('', null),
    customerId: uuid.required(),
    customerName: Joi.string().max(200).allow('', null),
    warehouseId: uuid.required(),
    carrier: Joi.string().max(100).allow('', null),
    shippingAddress: Joi.string().max(500).allow('', null),
    notes: Joi.string().max(1000).allow('', null),
    lines: Joi.array().items(line).min(1).required()
  }),

  fromOrder: Joi.object({ orderId: uuid.required() }),

  pick: Joi.object({
    lines: Joi.array().items(Joi.object({
      lineId: uuid.required(),
      pickedQty: Joi.number().min(0).precision(3).required()
    })).default([])
  }),

  pack: Joi.object({
    packageCount: Joi.number().integer().min(1),
    packedWeightKg: Joi.number().min(0).precision(3)
  }),

  dispatch: Joi.object({
    carrier: Joi.string().max(100).allow('', null),
    trackingNumber: Joi.string().max(120).allow('', null)
  }),

  reason: Joi.object({ reason: Joi.string().min(3).max(255).required() })
};
