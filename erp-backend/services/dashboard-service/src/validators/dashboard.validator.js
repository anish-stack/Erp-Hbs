'use strict';
const Joi = require('joi');
module.exports = {
  keyParam: Joi.object({ key: Joi.string().max(60).required() }),
  summaryQuery: Joi.object({ widgets: Joi.string().max(500) }),
  layoutSave: Joi.object({ widgetKeys: Joi.array().items(Joi.string().max(60)).min(1).max(20).required() })
};
