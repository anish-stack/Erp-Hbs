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
  created: (user, actorId) =>
    emit(
      EVENTS.USER.CREATED,
      {
        userId: user.id,
        employeeCode: user.employeeCode,
        email: user.email,
        roleId: user.role ? user.role.id : user.roleId,
        departmentId: user.department ? user.department.id : user.departmentId
      },
      actorId
    ),

  updated: (userId, changes, actorId) =>
    emit(EVENTS.USER.UPDATED, { userId, changes }, actorId),

  deleted: (userId, actorId) => emit(EVENTS.USER.DELETED, { userId }, actorId),

  statusChanged: (userId, status, previousStatus, actorId) =>
    emit(EVENTS.USER.STATUS_CHANGED, { userId, status, previousStatus }, actorId),

  roleChanged: (userId, roleId, previousRoleId, actorId) =>
    emit(EVENTS.USER.UPDATED, { userId, changes: ['roleId'], roleId, previousRoleId }, actorId),

  audit: (payload, actorId) => emit(EVENTS.AUDIT.LOG, payload, actorId),

  emit
};
