'use strict';

const { cache, utils, ApiError, constants } = require('@erp/shared');
const config = require('../config');

const CACHE_KEYS = constants.CACHE_KEYS;

function key(purpose, identifier) {
  return CACHE_KEYS.otp(`${purpose}:${identifier.toLowerCase()}`);
}

class OtpService {
  /** Generates and stores a hashed OTP. Plain value is returned once for delivery. */
  static async issue(purpose, identifier) {
    const code = utils.password.numericOtp(config.otp.length);
    await cache.set(
      key(purpose, identifier),
      { hash: utils.password.sha256(code), attempts: 0 },
      config.otp.ttlSeconds
    );
    return { code, ttlSeconds: config.otp.ttlSeconds };
  }

  static async verify(purpose, identifier, code) {
    const cacheKey = key(purpose, identifier);
    const stored = await cache.get(cacheKey);

    if (!stored) throw ApiError.badRequest('OTP expired or not requested');

    if (stored.attempts >= config.otp.maxVerifyAttempts) {
      await cache.del(cacheKey);
      throw ApiError.tooManyRequests('Too many invalid OTP attempts. Request a new code');
    }

    if (stored.hash !== utils.password.sha256(String(code))) {
      const ttl = await cache.ttl(cacheKey);
      await cache.set(cacheKey, { ...stored, attempts: stored.attempts + 1 }, ttl > 0 ? ttl : config.otp.ttlSeconds);
      throw ApiError.badRequest('Invalid OTP');
    }

    await cache.del(cacheKey);
    return true;
  }

  static async invalidate(purpose, identifier) {
    return cache.del(key(purpose, identifier));
  }
}

module.exports = OtpService;
