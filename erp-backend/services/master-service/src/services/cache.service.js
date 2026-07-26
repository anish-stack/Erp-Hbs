'use strict';

const { cache, logger } = require('@erp/shared');
const { CACHE } = require('../constants');
const config = require('../config');

/** Master data is read constantly and written rarely, so caching is aggressive. */
class CacheService {
  static async remember(key, resolver, ttl = config.cacheTtl) {
    try {
      return await cache.remember(key, ttl, resolver);
    } catch (err) {
      logger.warn('Cache miss fallback for %s: %s', key, err.message);
      return resolver();
    }
  }

  static async bust(reason, keys = []) {
    try {
      if (keys.length) {
        await cache.del(...keys);
      } else {
        const removed = await cache.delByPattern(CACHE.pattern);
        logger.info('Master cache invalidated (%s): %d keys', reason, removed);
      }
    } catch (err) {
      logger.error('Master cache invalidation failed: %s', err.message);
    }
  }

  static async bustAll(reason) {
    return CacheService.bust(reason, []);
  }
}

module.exports = CacheService;
