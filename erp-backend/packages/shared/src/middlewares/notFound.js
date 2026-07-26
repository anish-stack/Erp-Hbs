'use strict';

const ApiError = require('../http/ApiError');

module.exports = function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};
