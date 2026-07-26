'use strict';

const { broker, EVENTS, logger } = require('@erp/shared');

async function emit(routingKey, payload, actorId) {
  try {
    return await broker.publish(routingKey, payload, { userId: actorId });
  } catch (err) {
    logger.error('Event emit failed [%s]: %s', routingKey, err.message);
    return null;
  }
}

module.exports = {
  roleCreated: (role, actorId) =>
    emit(EVENTS.ROLE.CREATED, { roleId: role.id, code: role.code, name: role.name }, actorId),

  roleUpdated: (role, changes, actorId) =>
    emit(EVENTS.ROLE.UPDATED, { roleId: role.id, code: role.code, changes }, actorId),

  roleDeleted: (role, actorId) =>
    emit(EVENTS.ROLE.DELETED, { roleId: role.id, code: role.code }, actorId),

  permissionsChanged: (role, permissionCodes, actorId) =>
    emit(
      EVENTS.ROLE.PERMISSIONS_CHANGED,
      { roleId: role.id, code: role.code, permissionCount: permissionCodes.length, permissionCodes },
      actorId
    ),

  audit: (payload, actorId) => emit(EVENTS.AUDIT.LOG, payload, actorId)
};
