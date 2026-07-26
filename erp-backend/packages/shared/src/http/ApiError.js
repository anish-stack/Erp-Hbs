'use strict';

const HTTP_STATUS = require('./statusCodes');

class ApiError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = options.code || ApiError.defaultCode(statusCode);
    this.details = options.details || null;
    this.isOperational = options.isOperational !== false;
    Error.captureStackTrace(this, this.constructor);
  }

  static defaultCode(statusCode) {
    const map = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      413: 'PAYLOAD_TOO_LARGE',
      415: 'UNSUPPORTED_MEDIA_TYPE',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT'
    };
    return map[statusCode] || 'ERROR';
  }

  static badRequest(message = 'Bad request', details = null) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, message, { details });
  }

  static unauthorized(message = 'Unauthorized', details = null) {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, message, { details });
  }

  static forbidden(message = 'Forbidden', details = null) {
    return new ApiError(HTTP_STATUS.FORBIDDEN, message, { details });
  }

  static notFound(message = 'Resource not found', details = null) {
    return new ApiError(HTTP_STATUS.NOT_FOUND, message, { details });
  }

  static conflict(message = 'Resource conflict', details = null) {
    return new ApiError(HTTP_STATUS.CONFLICT, message, { details });
  }

  static validation(message = 'Validation failed', details = null) {
    return new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, message, {
      code: 'VALIDATION_ERROR',
      details
    });
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(HTTP_STATUS.TOO_MANY_REQUESTS, message);
  }

  static internal(message = 'Internal server error', details = null) {
    return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, message, {
      details,
      isOperational: false
    });
  }

  static serviceUnavailable(message = 'Service unavailable', details = null) {
    return new ApiError(HTTP_STATUS.SERVICE_UNAVAILABLE, message, { details });
  }

  toJSON() {
    return {
      success: false,
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
}

module.exports = ApiError;
