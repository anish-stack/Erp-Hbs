'use strict';

const { broker, EVENTS, logger } = require('@erp/shared');
const TokenService = require('../services/token.service');
const AuthLogRepository = require('../repositories/authLog.repository');
const { REVOKE_REASON, AUTH_LOG_EVENT, USER_STATUS } = require('../constants');

const QUEUE = 'auth-service.events';

/**
 * Security-critical: a user suspended, deactivated or deleted elsewhere must
 * lose every live session immediately, not at token expiry.
 */
async function handleUserEvent(event) {
  const userId = event.data && event.data.userId;
  if (!userId) return;

  if (event.event === EVENTS.USER.STATUS_CHANGED && event.data.status === USER_STATUS.ACTIVE) {
    return;
  }

  const revoked = await TokenService.revokeAllSessions(userId, REVOKE_REASON.ADMIN_REVOKED);

  await AuthLogRepository.record({
    userId,
    event: AUTH_LOG_EVENT.LOGOUT_ALL,
    success: true,
    reason: `${event.event} -> ${revoked} session(s) revoked`
  });

  logger.warn('Revoked %d session(s) for user %s after %s', revoked, userId, event.event);
}

async function registerConsumers() {
  await broker.subscribe(
    QUEUE,
    [EVENTS.USER.STATUS_CHANGED, EVENTS.USER.DELETED, EVENTS.ROLE.PERMISSIONS_CHANGED],
    async (event) => {
      if (event.event === EVENTS.ROLE.PERMISSIONS_CHANGED) {
        logger.info('Role %s permissions changed - fresh claims issue on next refresh', event.data.code);
        return;
      }
      await handleUserEvent(event);
    }
  );

  logger.info('Auth service consumers registered on queue %s', QUEUE);
}

module.exports = { registerConsumers, QUEUE, handleUserEvent };
