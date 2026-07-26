'use strict';

const Joi = require('joi');
const {
  SUPPLIER_TYPE,
  SUPPLIER_STATUS,
  TAX_TREATMENT,
  RISK_LEVEL,
  ADDRESS_TYPE,
  CONTACT_TYPE,
  DOCUMENT_TYPE,
  PRICE_SOURCE
} = require('../constants');

const uuid = Joi.string().uuid();

module.exports = {
  idParam: Joi.object({ id: Joi.string().uuid().required() }),

  childParams: Joi.object({
    id: Joi.string().uuid().required(),
    childId: Joi.string().uuid().required()
  }),

  list: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(150).allow(''),
    sortBy: Joi.string().valid('code', 'legalName', 'createdAt', 'overallRating'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    status: Joi.string().valid(...Object.values(SUPPLIER_STATUS)),
    type: Joi.string().valid(...Object.values(SUPPLIER_TYPE)),
    riskLevel: Joi.string().valid(...Object.values(RISK_LEVEL)),
    isPreferred: Joi.boolean(),
    currencyCode: Joi.string().length(3)
  }),

  create: Joi.object({
    code: Joi.string().max(30).allow('', null),
    legalName: Joi.string().min(3).max(200).required(),
    tradeName: Joi.string().max(200).allow('', null),
    type: Joi.string().valid(...Object.values(SUPPLIER_TYPE)).default('DISTRIBUTOR'),
    gstin: Joi.string().length(15).uppercase().allow('', null),
    pan: Joi.string().length(10).uppercase().allow('', null),
    cin: Joi.string().max(21).uppercase().allow('', null),
    msmeNumber: Joi.string().max(30).allow('', null),
    taxTreatment: Joi.string().valid(...Object.values(TAX_TREATMENT)).default('REGISTERED'),
    email: Joi.string().email().max(191).allow('', null),
    phone: Joi.string().max(30).allow('', null),
    website: Joi.string().uri().max(255).allow('', null),
    currencyCode: Joi.string().length(3).uppercase().default('INR'),
    paymentTermDays: Joi.number().integer().min(0).max(365).default(30),
    creditLimit: Joi.number().min(0).allow(null),
    incoterm: Joi.string().max(20).allow('', null),
    defaultLeadTime: Joi.number().integer().min(0).max(999).allow(null),
    categoryIds: Joi.array().items(uuid).max(100),
    manufacturerIds: Joi.array().items(uuid).max(200),
    riskLevel: Joi.string().valid(...Object.values(RISK_LEVEL)).default('MEDIUM'),
    notes: Joi.string().max(2000).allow('', null)
  }),

  update: Joi.object({
    legalName: Joi.string().min(3).max(200),
    tradeName: Joi.string().max(200).allow('', null),
    type: Joi.string().valid(...Object.values(SUPPLIER_TYPE)),
    gstin: Joi.string().length(15).uppercase().allow('', null),
    pan: Joi.string().length(10).uppercase().allow('', null),
    cin: Joi.string().max(21).uppercase().allow('', null),
    msmeNumber: Joi.string().max(30).allow('', null),
    taxTreatment: Joi.string().valid(...Object.values(TAX_TREATMENT)),
    email: Joi.string().email().max(191).allow('', null),
    phone: Joi.string().max(30).allow('', null),
    website: Joi.string().uri().max(255).allow('', null),
    currencyCode: Joi.string().length(3).uppercase(),
    paymentTermDays: Joi.number().integer().min(0).max(365),
    creditLimit: Joi.number().min(0).allow(null),
    incoterm: Joi.string().max(20).allow('', null),
    defaultLeadTime: Joi.number().integer().min(0).max(999).allow(null),
    categoryIds: Joi.array().items(uuid).max(100),
    manufacturerIds: Joi.array().items(uuid).max(200),
    isPreferred: Joi.boolean(),
    riskLevel: Joi.string().valid(...Object.values(RISK_LEVEL)),
    notes: Joi.string().max(2000).allow('', null)
  }).min(1),

  reason: Joi.object({ reason: Joi.string().min(5).max(500).required() }),

  address: Joi.object({
    type: Joi.string().valid(...Object.values(ADDRESS_TYPE)).default('REGISTERED'),
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
    department: Joi.string().valid(...Object.values(CONTACT_TYPE)).default('SALES'),
    email: Joi.string().email().max(191).allow('', null),
    phone: Joi.string().max(30).allow('', null),
    mobile: Joi.string().max(30).allow('', null),
    isPrimary: Joi.boolean().default(false),
    isActive: Joi.boolean().default(true)
  }),

  bankAccount: Joi.object({
    accountName: Joi.string().max(200).required(),
    accountNumber: Joi.string().pattern(/^[0-9A-Za-z]{6,50}$/).required()
      .messages({ 'string.pattern.base': 'Account number must be 6-50 alphanumeric characters' }),
    ifsc: Joi.string().length(11).uppercase().allow('', null),
    swift: Joi.string().max(11).uppercase().allow('', null),
    iban: Joi.string().max(34).uppercase().allow('', null),
    bankName: Joi.string().max(150).required(),
    branch: Joi.string().max(150).allow('', null),
    currencyCode: Joi.string().length(3).uppercase().default('INR'),
    isPrimary: Joi.boolean().default(false)
  }),

  document: Joi.object({
    type: Joi.string().valid(...Object.values(DOCUMENT_TYPE)).required(),
    fileId: uuid.required(),
    number: Joi.string().max(100).allow('', null),
    issuedOn: Joi.date().allow(null),
    expiresOn: Joi.date().allow(null),
    notes: Joi.string().max(500).allow('', null)
  }),

  price: Joi.object({
    partId: uuid.required(),
    supplierPartNumber: Joi.string().max(120).allow('', null),
    moq: Joi.number().integer().min(1).default(1),
    packQuantity: Joi.number().integer().min(1).default(1),
    unitPrice: Joi.number().positive().required(),
    currencyCode: Joi.string().length(3).uppercase(),
    discountPercent: Joi.number().min(0).max(100).default(0),
    leadTimeDays: Joi.number().integer().min(0).max(999).allow(null),
    stockQuantity: Joi.number().integer().min(0).allow(null),
    validFrom: Joi.date(),
    validTo: Joi.date().allow(null),
    isPreferred: Joi.boolean().default(false),
    source: Joi.string().valid(...Object.values(PRICE_SOURCE)),
    notes: Joi.string().max(500).allow('', null)
  }),

  priceUpdate: Joi.object({
    supplierPartNumber: Joi.string().max(120).allow('', null),
    moq: Joi.number().integer().min(1),
    unitPrice: Joi.number().positive(),
    discountPercent: Joi.number().min(0).max(100),
    leadTimeDays: Joi.number().integer().min(0).max(999).allow(null),
    stockQuantity: Joi.number().integer().min(0).allow(null),
    validTo: Joi.date().allow(null),
    isPreferred: Joi.boolean(),
    isActive: Joi.boolean(),
    notes: Joi.string().max(500).allow('', null)
  }).min(1),

  priceBulk: Joi.object({
    rows: Joi.array()
      .items(
        Joi.object({
          partId: uuid.required(),
          supplierPartNumber: Joi.string().max(120).allow('', null),
          moq: Joi.number().integer().min(1).default(1),
          packQuantity: Joi.number().integer().min(1).default(1),
          unitPrice: Joi.number().positive().required(),
          currencyCode: Joi.string().length(3).uppercase(),
          discountPercent: Joi.number().min(0).max(100).default(0),
          leadTimeDays: Joi.number().integer().min(0).max(999).allow(null),
          stockQuantity: Joi.number().integer().min(0).allow(null),
          validFrom: Joi.date(),
          validTo: Joi.date().allow(null),
          isPreferred: Joi.boolean(),
          source: Joi.string().valid(...Object.values(PRICE_SOURCE))
        })
      )
      .min(1)
      .max(5000)
      .required()
  }),

  priceList: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(150).allow(''),
    sortBy: Joi.string().valid('unitPrice', 'moq', 'updatedAt', 'validFrom'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    supplierId: uuid,
    partId: uuid,
    currencyCode: Joi.string().length(3),
    isActive: Joi.boolean()
  }),

  compare: Joi.object({
    partId: uuid.required(),
    quantity: Joi.number().integer().min(1).default(1),
    includeUnapproved: Joi.boolean().default(false)
  }),

  evaluate: Joi.object({
    periodStart: Joi.date().required(),
    periodEnd: Joi.date().required(),
    onTimeDeliveryScore: Joi.number().min(0).max(100),
    qualityScore: Joi.number().min(0).max(100),
    priceScore: Joi.number().min(0).max(100),
    responsivenessScore: Joi.number().min(0).max(100),
    complianceScore: Joi.number().min(0).max(100),
    remarks: Joi.string().max(1000).allow('', null),
    resetCounters: Joi.boolean().default(true)
  })
};
