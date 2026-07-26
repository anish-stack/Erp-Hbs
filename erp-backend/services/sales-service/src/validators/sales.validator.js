'use strict';
const Joi = require('joi');
const { QUOTATION_STATUS, ORDER_STATUS } = require('../constants');
const uuid = Joi.string().uuid();

const line = Joi.object({
  partId: uuid.required(),
  partCode: Joi.string().max(60).allow('', null),
  description: Joi.string().max(255).allow('', null),
  quantity: Joi.number().positive().precision(3).required(),
  unitPrice: Joi.number().min(0).precision(4).required(),
  discountPct: Joi.number().min(0).max(100).precision(3).default(0),
  taxRatePct: Joi.number().min(0).max(100).precision(3).default(0)
});

module.exports = {
  idParam: Joi.object({ id: Joi.string().uuid().required() }),

  quotationList: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(60).allow(''),
    sortBy: Joi.string().valid('createdAt', 'code', 'grandTotal'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    status: Joi.string().valid(...Object.values(QUOTATION_STATUS)),
    customerId: uuid
  }),
  quotationCreate: Joi.object({
    customerId: uuid.required(),
    customerName: Joi.string().max(200).allow('', null),
    currencyCode: Joi.string().length(3).uppercase().default('INR'),
    validUntil: Joi.date().iso().allow(null),
    terms: Joi.string().max(2000).allow('', null),
    notes: Joi.string().max(2000).allow('', null),
    lines: Joi.array().items(line).min(1).required()
  }),
  quotationUpdate: Joi.object({
    customerName: Joi.string().max(200).allow('', null),
    currencyCode: Joi.string().length(3).uppercase(),
    validUntil: Joi.date().iso().allow(null),
    terms: Joi.string().max(2000).allow('', null),
    notes: Joi.string().max(2000).allow('', null),
    lines: Joi.array().items(line).min(1)
  }).min(1),
  convert: Joi.object({
    warehouseId: uuid.allow(null),
    requiredDate: Joi.date().iso().allow(null),
    paymentTermDays: Joi.number().integer().min(0).max(365)
  }),

  orderList: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(60).allow(''),
    sortBy: Joi.string().valid('createdAt', 'code', 'grandTotal', 'orderDate'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    status: Joi.string().valid(...Object.values(ORDER_STATUS)),
    customerId: uuid,
    warehouseId: uuid
  }),
  orderCreate: Joi.object({
    customerId: uuid.required(),
    customerName: Joi.string().max(200).allow('', null),
    quotationId: uuid.allow(null),
    currencyCode: Joi.string().length(3).uppercase().default('INR'),
    requiredDate: Joi.date().iso().allow(null),
    warehouseId: uuid.allow(null),
    paymentTermDays: Joi.number().integer().min(0).max(365).default(30),
    terms: Joi.string().max(2000).allow('', null),
    notes: Joi.string().max(2000).allow('', null),
    lines: Joi.array().items(line).min(1).required()
  }),
  orderUpdate: Joi.object({
    customerName: Joi.string().max(200).allow('', null),
    requiredDate: Joi.date().iso().allow(null),
    warehouseId: uuid.allow(null),
    paymentTermDays: Joi.number().integer().min(0).max(365),
    terms: Joi.string().max(2000).allow('', null),
    notes: Joi.string().max(2000).allow('', null),
    lines: Joi.array().items(line).min(1)
  }).min(1),

  reason: Joi.object({ reason: Joi.string().min(3).max(255).required() })
};
