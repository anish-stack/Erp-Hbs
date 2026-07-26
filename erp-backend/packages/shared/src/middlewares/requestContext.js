'use strict';

const { randomUUID } = require('crypto');

/** Attaches a request id + start time and echoes it back on the response. */
module.exports = function requestContext(req, res, next) {
  req.id = req.headers['x-request-id'] || randomUUID();
  req.startTime = process.hrtime.bigint();
  res.setHeader('X-Request-Id', req.id);
  next();
};
