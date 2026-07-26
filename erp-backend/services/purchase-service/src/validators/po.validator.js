'use strict';
const Joi = require('joi');
const { PO_STATUS } = require('../constants');

const lineSchema = Joi.object({
  partId: Joi.string().uuid().required(),
  partNumber: Joi.string().max(120).required(),
  description: Joi.string().max(500).required(),
  quantity: Joi.number().integer().min(1).required(),
  uomCode: Joi.string().max(20).required(),
  unitPrice: Joi.number().positive().required(),
  discountPercent: Joi.number().min(0).max(100).default(0),
  taxRateId: Joi.string().uuid().allow(null),
  taxPercent: Joi.number().min(0).max(100).default(0)
});

module.exports = {
  idParam: Joi.object({ id: Joi.string().uuid().required() }),
  list: Joi.object({
    page: Joi.number().integer().min(1), limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(150).allow(''),
    sortBy: Joi.string().valid('createdAt', 'code', 'grandTotal', 'expectedDate'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    status: Joi.string().valid(...Object.values(PO_STATUS)),
    supplierId: Joi.string().uuid()
  }),
  create: Joi.object({
    supplierId: Joi.string().uuid().required(),
    rfqId: Joi.string().uuid().allow(null),
    currencyCode: Joi.string().length(3).uppercase(),
    paymentTermDays: Joi.number().integer().min(0).max(365),
    incoterm: Joi.string().max(20).allow('', null),
    deliveryAddress: Joi.string().max(500).allow('', null),
    expectedDate: Joi.date().allow(null),
    notes: Joi.string().max(2000).allow('', null),
    lines: Joi.array().items(lineSchema).min(1).max(200).required()
  }),
  update: Joi.object({
    paymentTermDays: Joi.number().integer().min(0).max(365),
    incoterm: Joi.string().max(20).allow('', null),
    deliveryAddress: Joi.string().max(500).allow('', null),
    expectedDate: Joi.date().allow(null),
    notes: Joi.string().max(2000).allow('', null)
  }).min(1),
  reason: Joi.object({ reason: Joi.string().min(5).max(500).required() })
};
