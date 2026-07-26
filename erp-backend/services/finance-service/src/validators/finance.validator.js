'use strict';
const Joi = require('joi');
const { INVOICE_TYPE, INVOICE_STATUS, PARTY_TYPE, SOURCE_TYPE, PAYMENT_METHOD, PAYMENT_STATUS } = require('../constants');
const uuid = Joi.string().uuid();

const invoiceLine = Joi.object({
  partId: uuid.allow(null),
  partCode: Joi.string().max(60).allow('', null),
  description: Joi.string().max(255).allow('', null),
  hsnCode: Joi.string().max(20).allow('', null),
  quantity: Joi.number().positive().precision(3).required(),
  unitPrice: Joi.number().min(0).precision(4).required(),
  discountPct: Joi.number().min(0).max(100).precision(3).default(0),
  taxRatePct: Joi.number().min(0).max(100).precision(3).default(0)
});

module.exports = {
  idParam: Joi.object({ id: Joi.string().uuid().required() }),

  invoiceList: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(60).allow(''),
    sortBy: Joi.string().valid('createdAt', 'code', 'grandTotal', 'dueDate', 'invoiceDate'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    type: Joi.string().valid(...Object.values(INVOICE_TYPE)),
    status: Joi.string().valid(...Object.values(INVOICE_STATUS)),
    partyType: Joi.string().valid(...Object.values(PARTY_TYPE)),
    partyId: uuid,
    overdueOnly: Joi.boolean()
  }),

  invoiceCreate: Joi.object({
    type: Joi.string().valid(...Object.values(INVOICE_TYPE)).required(),
    partyType: Joi.string().valid(...Object.values(PARTY_TYPE)).required(),
    partyId: uuid.required(),
    partyName: Joi.string().max(200).allow('', null),
    sourceType: Joi.string().valid(...Object.values(SOURCE_TYPE)),
    sourceId: uuid.allow(null),
    sourceCode: Joi.string().max(40).allow('', null),
    currencyCode: Joi.string().length(3).uppercase().default('INR'),
    placeOfSupply: Joi.string().length(2).allow('', null),
    buyerGstin: Joi.string().length(15).uppercase().allow('', null),
    paymentTermDays: Joi.number().integer().min(0).max(365),
    notes: Joi.string().max(2000).allow('', null),
    lines: Joi.array().items(invoiceLine).min(1).required()
  }),

  fromSalesOrder: Joi.object({ orderId: uuid.required() }),
  fromPurchaseOrder: Joi.object({ poId: uuid.required() }),

  paymentList: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(60).allow(''),
    sortBy: Joi.string().valid('createdAt', 'code', 'amount', 'paymentDate'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    direction: Joi.string().valid('INBOUND', 'OUTBOUND'),
    status: Joi.string().valid(...Object.values(PAYMENT_STATUS)),
    method: Joi.string().valid(...Object.values(PAYMENT_METHOD)),
    partyId: uuid
  }),

  paymentCreate: Joi.object({
    partyType: Joi.string().valid(...Object.values(PARTY_TYPE)).required(),
    partyId: uuid.required(),
    partyName: Joi.string().max(200).allow('', null),
    method: Joi.string().valid(...Object.values(PAYMENT_METHOD)).default('BANK'),
    reference: Joi.string().max(120).allow('', null),
    amount: Joi.number().positive().precision(2).required(),
    currencyCode: Joi.string().length(3).uppercase().default('INR'),
    paymentDate: Joi.date().iso(),
    status: Joi.string().valid(...Object.values(PAYMENT_STATUS)),
    notes: Joi.string().max(2000).allow('', null),
    allocations: Joi.array().items(Joi.object({
      invoiceId: uuid.required(),
      amount: Joi.number().positive().precision(2).required()
    })).default([])
  }),

  reason: Joi.object({ reason: Joi.string().min(3).max(255).required() })
};
