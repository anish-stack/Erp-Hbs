'use strict';

const { broker, EVENTS, cache, logger } = require('@erp/shared');
const { CACHE } = require('../constants');

const QUEUE = 'user-service.events';

/** Keeps cached user projections fresh when other services change identity data. */
async function registerConsumers() {
  await broker.subscribe(
    QUEUE,
    [EVENTS.ROLE.PERMISSIONS_CHANGED, EVENTS.ROLE.DELETED, EVENTS.AUTH.USER_LOGGED_IN],
    async (event) => {
      if (event.event === EVENTS.AUTH.USER_LOGGED_IN && event.data.userId) {
        await cache.del(CACHE.user(event.data.userId));
        return;
      }
      await cache.delByPattern(CACHE.pattern);
      logger.info('User cache invalidated after %s', event.event);
    }
  );

  logger.info('User service consumers registered on queue %s', QUEUE);
}

module.exports = { registerConsumers, QUEUE };
