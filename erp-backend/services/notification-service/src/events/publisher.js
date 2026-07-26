'use strict';
const { broker, logger } = require('@erp/shared');
const { EVENTS } = require('../constants');

async function emit(routingKey, payload, actorId) {
  try { return await broker.publish(routingKey, payload, { userId: actorId }); }
  catch (err) { logger.error('Event emit failed [%s]: %s', routingKey, err.message); return null; }
}

module.exports = {
  notificationCreated: (n) => emit(EVENTS.NOTIFICATION_CREATED, { notificationId: n.id, type: n.type }),
  emit
};
