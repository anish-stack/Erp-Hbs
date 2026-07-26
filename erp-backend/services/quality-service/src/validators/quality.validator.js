'use strict';
const Joi = require('joi');
const { INSPECTION_TYPE, INSPECTION_STATUS, SAMPLING_PLAN, DISPOSITION, DEFECT_SEVERITY, RESULT_FLAG, REF_TYPE } = require('../constants');
const uuid = Joi.string().uuid();

const checkpoint = Joi.object({
  parameter: Joi.string().max(150).required(),
  specification: Joi.string().max(255).allow('', null),
  method: Joi.string().max(120).allow('', null),
  mandatory: Joi.boolean().default(true)
});

const resultLine = Joi.object({
  parameter: Joi.string().max(150).required(),
  specification: Joi.string().max(255).allow('', null),
  method: Joi.string().max(120).allow('', null),
  observed: Joi.string().max(255).allow('', null),
  result: Joi.string().valid(...Object.values(RESULT_FLAG)).default('PASS'),
  defectType: Joi.string().max(120).allow('', null),
  severity: Joi.string().valid(...Object.values(DEFECT_SEVERITY)).allow(null),
  qtyDefective: Joi.number().min(0).precision(3).default(0),
  note: Joi.string().max(500).allow('', null)
});

module.exports = {
  idParam: Joi.object({ id: Joi.string().uuid().required() }),

  planList: Joi.object({ partId: uuid, categoryId: uuid, isActive: Joi.boolean() }),
  planCreate: Joi.object({
    code: Joi.string().max(30).allow('', null),
    name: Joi.string().min(2).max(150).required(),
    partId: uuid.allow(null),
    categoryId: uuid.allow(null),
    samplingPlan: Joi.string().valid(...Object.values(SAMPLING_PLAN)).default('SAMPLE'),
    aqlLevel: Joi.string().max(10).allow('', null),
    sampleSize: Joi.number().integer().min(0).allow(null),
    checkpoints: Joi.array().items(checkpoint).max(100),
    isActive: Joi.boolean().default(true)
  }),
  planUpdate: Joi.object({
    name: Joi.string().min(2).max(150),
    partId: uuid.allow(null),
    categoryId: uuid.allow(null),
    samplingPlan: Joi.string().valid(...Object.values(SAMPLING_PLAN)),
    aqlLevel: Joi.string().max(10).allow('', null),
    sampleSize: Joi.number().integer().min(0).allow(null),
    checkpoints: Joi.array().items(checkpoint).max(100),
    isActive: Joi.boolean()
  }).min(1),

  inspectionList: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(60).allow(''),
    sortBy: Joi.string().valid('createdAt', 'code', 'completedAt'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    status: Joi.string().valid(...Object.values(INSPECTION_STATUS)),
    type: Joi.string().valid(...Object.values(INSPECTION_TYPE)),
    partId: uuid, supplierId: uuid, grnId: uuid, pending: Joi.boolean()
  }),

  inspectionCreate: Joi.object({
    type: Joi.string().valid(...Object.values(INSPECTION_TYPE)).default('INCOMING'),
    grnId: uuid.allow(null),
    grnCode: Joi.string().max(40).allow('', null),
    poId: uuid.allow(null),
    supplierId: uuid.allow(null),
    partId: uuid.required(),
    partCode: Joi.string().max(60).allow('', null),
    categoryId: uuid.allow(null),
    lotId: uuid.allow(null),
    lotNumber: Joi.string().max(60).allow('', null),
    warehouseId: uuid.allow(null),
    planId: uuid.allow(null),
    receivedQty: Joi.number().positive().precision(3).required(),
    sampleSize: Joi.number().min(0).precision(3).allow(null),
    unitCost: Joi.number().min(0).precision(4).allow(null),
    remarks: Joi.string().max(1000).allow('', null),
    refType: Joi.string().valid(...Object.values(REF_TYPE)),
    refId: uuid.allow(null)
  }),

  results: Joi.object({ results: Joi.array().items(resultLine).min(1).required() }),

  complete: Joi.object({
    acceptedQty: Joi.number().min(0).precision(3),
    rejectedQty: Joi.number().min(0).precision(3),
    disposition: Joi.string().valid(...Object.values(DISPOSITION)),
    remarks: Joi.string().max(1000).allow('', null)
  }),

  reason: Joi.object({ reason: Joi.string().min(3).max(255).required() })
};
