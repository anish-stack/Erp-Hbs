'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const env = require('../config/env');

const ROUNDS = env.int('BCRYPT_ROUNDS', 12);

async function hash(plain) {
  const salt = await bcrypt.genSalt(ROUNDS);
  return bcrypt.hash(plain, salt);
}

async function compare(plain, hashed) {
  if (!plain || !hashed) return false;
  return bcrypt.compare(plain, hashed);
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function numericOtp(length = 6) {
  const max = 10 ** length;
  const value = crypto.randomInt(0, max);
  return String(value).padStart(length, '0');
}

module.exports = { hash, compare, randomToken, sha256, numericOtp };
