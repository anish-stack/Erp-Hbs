'use strict';

const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const ApiError = require('../http/ApiError');
const MESSAGES = require('../constants/messages');

function createRateLimiter(options = {}) {
  return rateLimit({
    windowMs: options.windowMs || env.int('RATE_LIMIT_WINDOW_MS', 60000),
    max: options.max || env.int('RATE_LIMIT_MAX', 300),
    standardHeaders: true,
    legacyHeaders: false,
    skip: options.skip,
    keyGenerator:
      options.keyGenerator ||
      ((req) => (req.user && req.user.id ? `user:${req.user.id}` : `ip:${req.ip}`)),
    handler: (req, res, next) => next(ApiError.tooManyRequests(MESSAGES.COMMON.RATE_LIMITED))
  });
}

const globalLimiter = () => createRateLimiter();

const authLimiter = () =>
  createRateLimiter({
    windowMs: env.int('RATE_LIMIT_AUTH_WINDOW_MS', 300000),
    max: env.int('RATE_LIMIT_AUTH_MAX', 20),
    keyGenerator: (req) => `auth:${req.ip}:${(req.body && req.body.email) || 'anon'}`
  });

module.exports = { createRateLimiter, globalLimiter, authLimiter };
