'use strict';

const { broker, EVENTS, logger } = require('@erp/shared');
const CacheService = require('../services/cache.service');

const QUEUE = 'role-service.events';

/**
 * Role Service reacts to identity changes elsewhere so cached menus and
 * permission sets never go stale.
 */
async function registerConsumers() {
  await broker.subscribe(
    QUEUE,
    [EVENTS.USER.UPDATED, EVENTS.USER.DELETED, EVENTS.USER.STATUS_CHANGED, EVENTS.AUTH.PASSWORD_CHANGED],
    async (event) => {
      const userId = event.data && (event.data.userId || event.data.id);
      if (!userId) return;

      await CacheService.bustRole(userId, `event:${event.event}`);
      logger.info('RBAC cache refreshed for user %s after %s', userId, event.event);
    }
  );

  logger.info('Role service consumers registered on queue %s', QUEUE);
}

module.exports = { registerConsumers, QUEUE };
