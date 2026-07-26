'use strict';

const { broker, EVENTS, logger } = require('@erp/shared');

/** Fire-and-forget domain events. Event bus failure must not break auth flows. */
async function emit(routingKey, payload, options = {}) {
  try {
    return await broker.publish(routingKey, payload, options);
  } catch (err) {
    logger.error('Event emit failed [%s]: %s', routingKey, err.message);
    return null;
  }
}

module.exports = {
  userRegistered: (user, actorId) =>
    emit(
      EVENTS.AUTH.USER_REGISTERED,
      {
        userId: user.id,
        email: user.email,
        employeeCode: user.employeeCode,
        firstName: user.firstName,
        lastName: user.lastName,
        roleId: user.roleId,
        departmentId: user.departmentId
      },
      { userId: actorId }
    ),

  userLoggedIn: (user, context) =>
    emit(
      EVENTS.AUTH.USER_LOGGED_IN,
      {
        userId: user.id,
        email: user.email,
        role: user.role.code,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      },
      { userId: user.id }
    ),

  passwordChanged: (userId, reason) =>
    emit(EVENTS.AUTH.PASSWORD_CHANGED, { userId, reason }, { userId }),

  tokenRevoked: (userId, payload) =>
    emit(EVENTS.AUTH.TOKEN_REVOKED, { userId, ...payload }, { userId }),

  audit: (payload, actorId) => emit(EVENTS.AUDIT.LOG, payload, { userId: actorId }),

  emit
};
