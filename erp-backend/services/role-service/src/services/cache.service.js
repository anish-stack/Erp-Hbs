'use strict';

const { cache, logger } = require('@erp/shared');
const { RBAC_CACHE_PATTERN } = require('../constants');

/**
 * RBAC data is read on every request across every service, so writes must
 * aggressively invalidate the shared Redis namespace.
 */
class CacheService {
  static async bustRbac(reason) {
    try {
      const removed = await cache.delByPattern(RBAC_CACHE_PATTERN);
      logger.info('RBAC cache invalidated (%s): %d keys', reason, removed);
      return removed;
    } catch (err) {
      logger.error('RBAC cache invalidation failed: %s', err.message);
      return 0;
    }
  }

  static async bustRole(roleId, reason) {
    try {
      const removed = await cache.delByPattern(`rbac:*${roleId}*`);
      await cache.delByPattern('rbac:roles:list:*');
      logger.info('Role cache invalidated %s (%s): %d keys', roleId, reason, removed);
      return removed;
    } catch (err) {
      logger.error('Role cache invalidation failed: %s', err.message);
      return 0;
    }
  }

  static async remember(key, ttl, resolver) {
    try {
      return await cache.remember(key, ttl, resolver);
    } catch (err) {
      logger.warn('Cache read failed (%s), falling back to database: %s', key, err.message);
      return resolver();
    }
  }
}

module.exports = CacheService;
