'use strict';

const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const env = require('../config/env');
const ApiError = require('../http/ApiError');

function accessSecret() {
  return env.required('JWT_ACCESS_SECRET');
}

function refreshSecret() {
  return env.required('JWT_REFRESH_SECRET');
}

function baseOptions() {
  return {
    issuer: env.str('JWT_ISSUER', 'erp-backend'),
    audience: env.str('JWT_AUDIENCE', 'erp-clients')
  };
}

function signAccessToken(payload) {
  const jti = randomUUID();
  const token = jwt.sign({ ...payload, jti, type: 'access' }, accessSecret(), {
    ...baseOptions(),
    expiresIn: env.str('JWT_ACCESS_EXPIRES_IN', '7h')
  });
  return { token, jti };
}

function signRefreshToken(payload) {
  const jti = randomUUID();
  const token = jwt.sign({ ...payload, jti, type: 'refresh' }, refreshSecret(), {
    ...baseOptions(),
    expiresIn: env.str('JWT_REFRESH_EXPIRES_IN', '7d')
  });
  return { token, jti };
}

function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, accessSecret(), baseOptions());
    if (decoded.type !== 'access') throw new Error('Invalid token type');
    return decoded;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Access token expired', { code: 'TOKEN_EXPIRED' });
    }
    throw new ApiError(401, 'Invalid access token', { code: 'INVALID_TOKEN' });
  }
}

function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, refreshSecret(), baseOptions());
    if (decoded.type !== 'refresh') throw new Error('Invalid token type');
    return decoded;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Refresh token expired', { code: 'REFRESH_TOKEN_EXPIRED' });
    }
    throw new ApiError(401, 'Invalid refresh token', { code: 'INVALID_REFRESH_TOKEN' });
  }
}

function decode(token) {
  return jwt.decode(token, { complete: false });
}

function extractBearer(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decode,
  extractBearer
};
