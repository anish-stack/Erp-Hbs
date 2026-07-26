'use strict';
const Joi = require('joi');
const { REPORT_FORMAT, RUN_STATUS } = require('../constants');
const uuid = Joi.string().uuid();

module.exports = {
  idParam: Joi.object({ id: Joi.string().uuid().required() }),

  list: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sortBy: Joi.string().valid('createdAt', 'code'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    reportKey: Joi.string().max(60),
    status: Joi.string().valid(...Object.values(RUN_STATUS)),
    requestedBy: uuid
  }),

  request: Joi.object({
    reportKey: Joi.string().max(60).required(),
    format: Joi.string().valid(...Object.values(REPORT_FORMAT)).default('XLSX'),
    params: Joi.object().unknown(true).default({})
  })
};
