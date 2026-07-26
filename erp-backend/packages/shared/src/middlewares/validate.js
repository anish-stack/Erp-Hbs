'use strict';

const ApiError = require('../http/ApiError');
const MESSAGES = require('../constants/messages');

const JOI_OPTIONS = {
  abortEarly: false,
  allowUnknown: true,
  stripUnknown: { objects: true },
  convert: true
};

/**
 * Validates req[source] against a Joi schema and replaces it with the sanitised value.
 * @param {import('joi').Schema} schema
 * @param {'body'|'query'|'params'|'headers'} source
 */
function validate(schema, source = 'body') {
  return function validateMiddleware(req, res, next) {
    const { error, value } = schema.validate(req[source], JOI_OPTIONS);

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, '')
      }));
      return next(ApiError.validation(MESSAGES.COMMON.VALIDATION_FAILED, details));
    }

    if (source === 'query') {
      for (const key of Object.keys(value)) req.query[key] = value[key];
    } else {
      req[source] = value;
    }

    return next();
  };
}

module.exports = validate;
