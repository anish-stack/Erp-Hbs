'use strict';

const Joi = require('joi');
const { CUSTOMER_TYPE, CUSTOMER_STATUS, CUSTOMER_SEGMENT, TAX_TREATMENT, ADDRESS_TYPE, ACTIVITY_TYPE, CREDIT_LOG_TYPE } = require('../constants');

module.exports = {
  idParam: Joi.object({ id: Joi.string().uuid().required() }),
  childParams: Joi.object({ id: Joi.string().uuid().required(), childId: Joi.string().uuid().required() }),

  list: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(150).allow(''),
    sortBy: Joi.string().valid('code', 'legalName', 'createdAt', 'creditUsed'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    status: Joi.string().valid(...Object.values(CUSTOMER_STATUS)),
    segment: Joi.string().valid(...Object.values(CUSTOMER_SEGMENT)),
    ownerId: Joi.string().uuid()
  }),

  create: Joi.object({
    code: Joi.string().max(30).allow('', null),
    legalName: Joi.string().min(2).max(200).required(),
    tradeName: Joi.string().max(200).allow('', null),
    type: Joi.string().valid(...Object.values(CUSTOMER_TYPE)).default('BUSINESS'),
    gstin: Joi.string().length(15).uppercase().allow('', null),
    pan: Joi.string().length(10).uppercase().allow('', null),
    taxTreatment: Joi.string().valid(...Object.values(TAX_TREATMENT)).default('REGISTERED'),
    email: Joi.string().email().max(191).allow('', null),
    phone: Joi.string().max(30).allow('', null),
    website: Joi.string().uri().max(255).allow('', null),
    currencyCode: Joi.string().length(3).uppercase().default('INR'),
    paymentTermDays: Joi.number().integer().min(0).max(365).default(30),
    creditLimit: Joi.number().min(0).default(0),
    industry: Joi.string().max(100).allow('', null),
    segment: Joi.string().valid(...Object.values(CUSTOMER_SEGMENT)).default('SMB'),
    ownerId: Joi.string().uuid(),
    leadId: Joi.string().uuid().allow(null),
    notes: Joi.string().max(2000).allow('', null)
  }),

  update: Joi.object({
    legalName: Joi.string().min(2).max(200),
    tradeName: Joi.string().max(200).allow('', null),
    type: Joi.string().valid(...Object.values(CUSTOMER_TYPE)),
    gstin: Joi.string().length(15).uppercase().allow('', null),
    pan: Joi.string().length(10).uppercase().allow('', null),
    taxTreatment: Joi.string().valid(...Object.values(TAX_TREATMENT)),
    email: Joi.string().email().max(191).allow('', null),
    phone: Joi.string().max(30).allow('', null),
    website: Joi.string().uri().max(255).allow('', null),
    currencyCode: Joi.string().length(3).uppercase(),
    paymentTermDays: Joi.number().integer().min(0).max(365),
    creditLimit: Joi.number().min(0),
    industry: Joi.string().max(100).allow('', null),
    segment: Joi.string().valid(...Object.values(CUSTOMER_SEGMENT)),
    ownerId: Joi.string().uuid(),
    notes: Joi.string().max(2000).allow('', null)
  }),

  setStatus: Joi.object({
    status: Joi.string().valid(...Object.values(CUSTOMER_STATUS)).required(),
    reason: Joi.string().max(500).when('status', { is: 'BLACKLISTED', then: Joi.required() })
  }),

  creditAdjust: Joi.object({
    type: Joi.string().valid(...Object.values(CREDIT_LOG_TYPE)).required(),
    amount: Joi.number().positive().required(),
    reference: Joi.string().max(100).allow('', null),
    notes: Joi.string().max(500).allow('', null)
  }),

  creditCheck: Joi.object({ amount: Joi.number().positive().required() }),

  address: Joi.object({
    type: Joi.string().valid(...Object.values(ADDRESS_TYPE)).default('BILLING'),
    line1: Joi.string().max(255).required(),
    line2: Joi.string().max(255).allow('', null),
    city: Joi.string().max(100).required(),
    state: Joi.string().max(100).required(),
    stateCode: Joi.string().max(5).allow('', null),
    country: Joi.string().max(100).default('India'),
    pincode: Joi.string().max(15).allow('', null),
    isPrimary: Joi.boolean().default(false)
  }),

  contact: Joi.object({
    name: Joi.string().min(2).max(150).required(),
    designation: Joi.string().max(150).allow('', null),
    email: Joi.string().email().max(191).allow('', null),
    phone: Joi.string().max(30).allow('', null),
    mobile: Joi.string().max(30).allow('', null),
    isPrimary: Joi.boolean().default(false),
    isActive: Joi.boolean().default(true)
  }),

  activity: Joi.object({
    leadId: Joi.string().uuid(),
    customerId: Joi.string().uuid(),
    type: Joi.string().valid(...Object.values(ACTIVITY_TYPE)).required(),
    subject: Joi.string().max(200).required(),
    notes: Joi.string().max(2000).allow('', null),
    dueAt: Joi.date().allow(null)
  }).or('leadId', 'customerId'),

  activityComplete: Joi.object({ outcome: Joi.string().max(255).allow('', null) }),

  activityList: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100)
  })
};
