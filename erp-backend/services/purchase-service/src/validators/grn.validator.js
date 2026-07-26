'use strict';
const Joi = require('joi');

module.exports = {
  poIdParam: Joi.object({ poId: Joi.string().uuid().required() }),
  grnIdParam: Joi.object({ id: Joi.string().uuid().required() }),

  create: Joi.object({
    supplierInvoiceNumber: Joi.string().max(100).allow('', null),
    vehicleNumber: Joi.string().max(30).allow('', null),
    inspectionRequired: Joi.boolean().default(true),
    notes: Joi.string().max(1000).allow('', null),
    lines: Joi.array().items(Joi.object({
      poLineId: Joi.string().uuid().required(),
      receivedQty: Joi.number().integer().min(1).required(),
      batchNumber: Joi.string().max(100).allow('', null),
      expiryDate: Joi.date().allow(null)
    })).min(1).required()
  }),

  inspectionResult: Joi.object({
    results: Joi.array().items(Joi.object({
      grnLineId: Joi.string().uuid().required(),
      acceptedQty: Joi.number().integer().min(0).required(),
      rejectedQty: Joi.number().integer().min(0).required(),
      rejectionReason: Joi.string().max(500).allow('', null)
    })).min(1).required()
  })
};
