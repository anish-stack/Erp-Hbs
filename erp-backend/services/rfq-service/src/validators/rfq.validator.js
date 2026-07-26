'use strict';

const Joi = require('joi');
const { RFQ_STATUS } = require('../constants');

const lineSchema = Joi.object({
  partId: Joi.string().uuid().required(),
  partNumber: Joi.string().max(120).required(),
  description: Joi.string().max(500).required(),
  quantity: Joi.number().integer().min(1).required(),
  uomCode: Joi.string().max(20).required(),
  targetPrice: Joi.number().min(0).allow(null),
  specifications: Joi.object().allow(null),
  notes: Joi.string().max(500).allow('', null)
});

module.exports = {
  idParam: Joi.object({ id: Joi.string().uuid().required() }),
  supplierParams: Joi.object({ id: Joi.string().uuid().required(), supplierId: Joi.string().uuid().required() }),

  list: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(150).allow(''),
    sortBy: Joi.string().valid('createdAt', 'code', 'validTill', 'responseDeadline'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    status: Joi.string().valid(...Object.values(RFQ_STATUS)),
    requestedBy: Joi.string().uuid()
  }),

  create: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    departmentId: Joi.string().uuid().allow(null),
    currencyCode: Joi.string().length(3).uppercase().default('INR'),
    validTill: Joi.date().allow(null),
    responseDeadline: Joi.date().allow(null),
    notes: Joi.string().max(2000).allow('', null),
    lines: Joi.array().items(lineSchema).min(1).max(200).required()
  }),

  update: Joi.object({
    title: Joi.string().min(3).max(200),
    departmentId: Joi.string().uuid().allow(null),
    currencyCode: Joi.string().length(3).uppercase(),
    validTill: Joi.date().allow(null),
    responseDeadline: Joi.date().allow(null),
    notes: Joi.string().max(2000).allow('', null)
  }).min(1),

  addSuppliers: Joi.object({
    supplierIds: Joi.array().items(Joi.string().uuid()).min(1).max(50).required()
  }),

  cancel: Joi.object({ reason: Joi.string().min(5).max(500).required() }),

  decline: Joi.object({ reason: Joi.string().min(3).max(500).required() }),

  submitQuote: Joi.object({
    currencyCode: Joi.string().length(3).uppercase(),
    validTill: Joi.date().allow(null),
    paymentTermDays: Joi.number().integer().min(0).max(365).allow(null),
    incoterm: Joi.string().max(20).allow('', null),
    notes: Joi.string().max(1000).allow('', null),
    lines: Joi.array().items(Joi.object({
      rfqLineId: Joi.string().uuid().required(),
      unitPrice: Joi.number().positive().required(),
      moq: Joi.number().integer().min(1).default(1),
      quotedQty: Joi.number().integer().min(1).required(),
      leadTimeDays: Joi.number().integer().min(0).max(999).allow(null),
      discountPercent: Joi.number().min(0).max(100).default(0),
      alternatePartId: Joi.string().uuid().allow(null),
      alternateNotes: Joi.string().max(500).allow('', null),
      notes: Joi.string().max(500).allow('', null)
    })).min(1).required()
  }),

  award: Joi.object({
    awards: Joi.array().items(Joi.object({
      rfqLineId: Joi.string().uuid().required(),
      supplierId: Joi.string().uuid().required(),
      quantity: Joi.number().integer().min(1).allow(null)
    })).min(1).required()
  })
};
