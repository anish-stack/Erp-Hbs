'use strict';

const logger = require('../logger');
const ApiError = require('../http/ApiError');
const HTTP_STATUS = require('../http/statusCodes');
const env = require('../config/env');
const MESSAGES = require('../constants/messages');

function normalisePrismaError(err) {
  switch (err.code) {
    case 'P2002':
      return ApiError.conflict('Duplicate value violates a unique constraint', {
        fields: (err.meta && err.meta.target) || null
      });
    case 'P2003':
      return ApiError.badRequest('Related record not found (foreign key constraint)', {
        field: (err.meta && err.meta.field_name) || null
      });
    case 'P2025':
      return ApiError.notFound('Record not found');
    case 'P2014':
      return ApiError.badRequest('Operation violates a required relation');
    default:
      return null;
  }
}

function normalise(err) {
  if (err instanceof ApiError) return err;

  if (err && err.name === 'PrismaClientKnownRequestError') {
    const mapped = normalisePrismaError(err);
    if (mapped) return mapped;
  }

  if (err && err.name === 'PrismaClientValidationError') {
    return ApiError.badRequest('Invalid database query payload');
  }

  if (err && err.name === 'MulterError') {
    const code = err.code === 'LIMIT_FILE_SIZE' ? HTTP_STATUS.PAYLOAD_TOO_LARGE : HTTP_STATUS.BAD_REQUEST;
    return new ApiError(code, err.message, { code: err.code });
  }

  if (err && err.type === 'entity.parse.failed') {
    return ApiError.badRequest('Malformed JSON payload');
  }

  if (err && err.type === 'entity.too.large') {
    return new ApiError(HTTP_STATUS.PAYLOAD_TOO_LARGE, 'Request payload too large');
  }

  return ApiError.internal(err && err.message ? err.message : MESSAGES.COMMON.INTERNAL_ERROR);
}

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  const error = normalise(err);

  const logMeta = {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    status: error.statusCode,
    code: error.code,
    userId: req.user ? req.user.id : null
  };

  if (error.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    logger.error(`${error.message}\n${err.stack || ''}`, logMeta);
  } else {
    logger.warn(error.message, logMeta);
  }

  const body = {
    success: false,
    code: error.code,
    message:
      error.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR && env.isProd()
        ? MESSAGES.COMMON.INTERNAL_ERROR
        : error.message,
    details: error.details,
    requestId: req.id,
    timestamp: new Date().toISOString()
  };

  if (!env.isProd() && error.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    body.stack = err.stack;
  }

  res.status(error.statusCode).json(body);
};
