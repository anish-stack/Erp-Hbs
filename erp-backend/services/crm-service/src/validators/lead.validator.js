"use strict";

const Joi = require("joi");
const { LEAD_SOURCE, LEAD_STAGE } = require("../constants");

module.exports = {
  idParam: Joi.object({ id: Joi.string().uuid().required() }),

  list: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(150).allow(""),
    sortBy: Joi.string().valid(
      "createdAt",
      "companyName",
      "estimatedValue",
      "nextFollowUpAt",
    ),
    sortOrder: Joi.string().valid("asc", "desc"),
    stage: Joi.string().valid(...Object.values(LEAD_STAGE)),
    source: Joi.string().valid(...Object.values(LEAD_SOURCE)),
    ownerId: Joi.string().uuid(),
  }),

  create: Joi.object({
    companyName: Joi.string().min(2).max(200).required(),
    contactName: Joi.string().min(2).max(150).required(),
    email: Joi.string().email().max(191).allow("", null),
    phone: Joi.string().max(30).allow("", null),
    designation: Joi.string().max(150).allow("", null),
    source: Joi.string()
      .valid(...Object.values(LEAD_SOURCE))
      .default("OTHER"),
    estimatedValue: Joi.number().min(0).allow(null),
    currencyCode: Joi.string().length(3).uppercase().default("INR"),
    categoryIds: Joi.array().items(Joi.string().uuid()).max(50),
    city: Joi.string().max(100).allow("", null),
    state: Joi.string().max(100).allow("", null),
    country: Joi.string().max(100).default("India"),
    ownerId: Joi.string().uuid().optional().allow(null, ""),
    nextFollowUpAt: Joi.date().allow(null),
    tags: Joi.array().items(Joi.string().max(40)).max(20),
    notes: Joi.string().max(2000).allow("", null),
  }),

  update: Joi.object({
    companyName: Joi.string().min(2).max(200),
    contactName: Joi.string().min(2).max(150),
    email: Joi.string().email().max(191).allow("", null),
    phone: Joi.string().max(30).allow("", null),
    designation: Joi.string().max(150).allow("", null),
    source: Joi.string().valid(...Object.values(LEAD_SOURCE)),
    estimatedValue: Joi.number().min(0).allow(null),
    currencyCode: Joi.string().length(3).uppercase(),
    categoryIds: Joi.array().items(Joi.string().uuid()).max(50),
    city: Joi.string().max(100).allow("", null),
    state: Joi.string().max(100).allow("", null),
    country: Joi.string().max(100),
    ownerId: Joi.string().uuid(),
    nextFollowUpAt: Joi.date().allow(null),
    tags: Joi.array().items(Joi.string().max(40)).max(20),
    notes: Joi.string().max(2000).allow("", null),
  }).min(1),

  changeStage: Joi.object({
    stage: Joi.string()
      .valid(...Object.values(LEAD_STAGE))
      .required(),
    reason: Joi.string().max(500).allow("", null),
    lostReason: Joi.string()
      .max(500)
      .when("stage", { is: "LOST", then: Joi.required() }),
  }),

  followUp: Joi.object({
    notes: Joi.string().max(1000).allow("", null),
    nextFollowUpAt: Joi.date().allow(null),
  }),

  convert: Joi.object({
    code: Joi.string().max(30).allow("", null),
    legalName: Joi.string().max(200),
    tradeName: Joi.string().max(200).allow("", null),
    type: Joi.string()
      .valid("BUSINESS", "INDIVIDUAL", "GOVERNMENT")
      .default("BUSINESS"),
    gstin: Joi.string().length(15).uppercase().allow("", null),
    pan: Joi.string().length(10).uppercase().allow("", null),
    taxTreatment: Joi.string()
      .valid("REGISTERED", "COMPOSITION", "UNREGISTERED", "OVERSEAS", "SEZ")
      .default("REGISTERED"),
    email: Joi.string().email().allow("", null),
    phone: Joi.string().max(30).allow("", null),
    currencyCode: Joi.string().length(3).uppercase(),
    paymentTermDays: Joi.number().integer().min(0).max(365).default(30),
    creditLimit: Joi.number().min(0).default(0),
    segment: Joi.string()
      .valid("ENTERPRISE", "SMB", "STARTUP", "GOVERNMENT", "RETAIL")
      .default("SMB"),
  }),
};
