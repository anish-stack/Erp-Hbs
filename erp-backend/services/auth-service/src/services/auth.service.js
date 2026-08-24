'use strict';

const { utils, ApiError, cache, constants, logger } = require('@erp/shared');
const config = require('../config');
const UserRepository = require('../repositories/user.repository');
const SessionRepository = require('../repositories/session.repository');
const PasswordResetRepository = require('../repositories/passwordReset.repository');
const AuthLogRepository = require('../repositories/authLog.repository');
const TokenService = require('./token.service');
const OtpService = require('./otp.service');
const emailQueue = require('../queues/email.queue');
const publisher = require('../events/publisher');
const { USER_STATUS, AUTH_LOG_EVENT, REVOKE_REASON, OTP_PURPOSE } = require('../constants');
const { prisma } = require('../config/prisma');

const MESSAGES = constants.MESSAGES;
const CACHE_KEYS = constants.CACHE_KEYS;

function publicUser(user) {
  return {
    id: user.id,
    employeeCode: user.employeeCode,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: [user.firstName, user.lastName].filter(Boolean).join(' '),
    email: user.email,
    mobile: user.mobile,
    designation: user.designation,
    status: user.status,
    isEmailVerified: user.isEmailVerified,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt,
    role: user.role
      ? {
          id: user.role.id,
          code: user.role.code,
          name: user.role.name,
          landingPath: user.role.landingPath
        }
      : null,
    department: user.department || null,
    permissions: user.role && user.role.permissions
      ? user.role.permissions.map((rp) => rp.permission.code)
      : []
  };
}

function assertUsable(user) {
  if (user.status === USER_STATUS.SUSPENDED) {
    throw ApiError.forbidden('Account suspended. Contact your administrator');
  }
  if (user.status !== USER_STATUS.ACTIVE) {
    throw ApiError.forbidden(MESSAGES.AUTH.ACCOUNT_DISABLED);
  }
  if (!user.role || !user.role.isActive) {
    throw ApiError.forbidden('Assigned role is inactive. Contact your administrator');
  }
}

class AuthService {
  static async register(payload, context = {}, actorId = null) {
    const existing = await UserRepository.findByEmailOrMobileOrCode(payload);
    if (existing) {
      const field =
        existing.email === payload.email.toLowerCase()
          ? 'email'
          : existing.employeeCode === payload.employeeCode
            ? 'employeeCode'
            : 'mobile';
      throw ApiError.conflict(`A user with this ${field} already exists`, { field });
    }

    const role = await prisma.role.findFirst({
      where: { id: payload.roleId, deletedAt: null, isActive: true }
    });
    if (!role) throw ApiError.badRequest('Role not found or inactive', { field: 'roleId' });

    if (payload.departmentId) {
      const department = await prisma.department.findFirst({
        where: { id: payload.departmentId, deletedAt: null }
      });
      if (!department) throw ApiError.badRequest('Department not found', { field: 'departmentId' });
    }

    const hashed = await utils.password.hash(payload.password);

    const user = await UserRepository.create(
      {
        employeeCode: payload.employeeCode,
        firstName: payload.firstName,
        lastName: payload.lastName || null,
        email: payload.email,
        mobile: payload.mobile || null,
        designation: payload.designation || null,
        password: hashed,
        roleId: payload.roleId,
        departmentId: payload.departmentId || null,
        mustChangePassword: payload.mustChangePassword !== false
      },
      actorId
    );

    await AuthLogRepository.record({
      userId: user.id,
      email: user.email,
      event: AUTH_LOG_EVENT.REGISTER,
      success: true,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    await emailQueue.sendWelcome({
      to: user.email,
      firstName: user.firstName,
      email: user.email,
      temporaryPassword: payload.sendCredentials ? payload.password : null
    });

    await publisher.userRegistered(user, actorId);

    return publicUser(user);
  }

  static async login({ email, password }, context = {}) {
    const user = await UserRepository.findByEmail(email);

    if (!user) {
      await AuthLogRepository.record({
        email: email.toLowerCase(),
        event: AUTH_LOG_EVENT.LOGIN,
        success: false,
        reason: 'USER_NOT_FOUND',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      });
      throw ApiError.unauthorized(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      throw ApiError.forbidden(`${MESSAGES.AUTH.ACCOUNT_LOCKED}. Try again in ${minutes} minute(s)`);
    }

    const passwordValid = await utils.password.compare(password, user.password);

    if (!passwordValid) {
      const attempts = user.failedLoginCount + 1;
      const shouldLock = attempts >= config.security.maxLoginAttempts;
      const lockedUntil = shouldLock
        ? new Date(Date.now() + config.security.lockMinutes * 60000)
        : null;

      await UserRepository.registerFailedLogin(user.id, { lock: shouldLock, lockedUntil });

      await AuthLogRepository.record({
        userId: user.id,
        email: user.email,
        event: shouldLock ? AUTH_LOG_EVENT.ACCOUNT_LOCKED : AUTH_LOG_EVENT.LOGIN,
        success: false,
        reason: shouldLock ? 'ACCOUNT_LOCKED' : `INVALID_PASSWORD (${attempts})`,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      });

      if (shouldLock) {
        await emailQueue.sendAccountLocked({
          to: user.email,
          firstName: user.firstName,
          minutes: config.security.lockMinutes,
          ipAddress: context.ipAddress
        });
        throw ApiError.forbidden(
          `${MESSAGES.AUTH.ACCOUNT_LOCKED}. Try again in ${config.security.lockMinutes} minute(s)`
        );
      }

      throw ApiError.unauthorized(MESSAGES.AUTH.INVALID_CREDENTIALS, {
        attemptsRemaining: config.security.maxLoginAttempts - attempts
      });
    }

    assertUsable(user);

    const tokens = await TokenService.issuePair(user, context);
    await UserRepository.registerSuccessfulLogin(user.id, context.ipAddress);

    await AuthLogRepository.record({
      userId: user.id,
      email: user.email,
      event: AUTH_LOG_EVENT.LOGIN,
      success: true,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    await publisher.userLoggedIn(user, context);

    return { user: publicUser(user), tokens };
  }

  /** Rotating refresh with reuse detection: a replayed token kills the whole family. */
  static async refresh(refreshToken, context = {}) {
    const decoded = utils.jwt.verifyRefreshToken(refreshToken);
    const session = await SessionRepository.findByJti(decoded.jti);

    if (!session) throw ApiError.unauthorized(MESSAGES.AUTH.TOKEN_REVOKED);

    if (session.revokedAt) {
      await TokenService.revokeFamily(session.familyId, REVOKE_REASON.REUSE_DETECTED);
      await TokenService.revokeAllSessions(session.userId, REVOKE_REASON.REUSE_DETECTED);

      await AuthLogRepository.record({
        userId: session.userId,
        event: AUTH_LOG_EVENT.REFRESH_REUSE_DETECTED,
        success: false,
        reason: 'REPLAYED_REFRESH_TOKEN',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      });

      await publisher.tokenRevoked(session.userId, { reason: REVOKE_REASON.REUSE_DETECTED });
      logger.error('Refresh token reuse detected for user %s', session.userId);

      throw ApiError.unauthorized('Session invalidated. Please sign in again', {
        code: 'REFRESH_REUSE_DETECTED'
      });
    }

    if (session.expiresAt <= new Date()) {
      throw ApiError.unauthorized('Refresh token expired. Please sign in again');
    }

    if (session.tokenHash !== utils.password.sha256(refreshToken)) {
      await TokenService.revokeFamily(session.familyId, REVOKE_REASON.REUSE_DETECTED);
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const user = await UserRepository.findById(session.userId);
    if (!user) throw ApiError.unauthorized(MESSAGES.AUTH.UNAUTHORIZED);
    assertUsable(user);

    if (session.accessJti) await TokenService.blacklistAccessJti(session.accessJti);

    const tokens = await TokenService.issuePair(
      user,
      { ...context, rotateFromJti: session.refreshJti },
      session.familyId
    );

    await AuthLogRepository.record({
      userId: user.id,
      email: user.email,
      event: AUTH_LOG_EVENT.REFRESH,
      success: true,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return { user: publicUser(user), tokens };
  }

  static async logout({ userId, accessJti }, refreshToken = null, context = {}) {
    if (accessJti) await TokenService.blacklistAccessJti(accessJti);

    if (refreshToken) {
      const decoded = utils.jwt.decode(refreshToken);
      if (decoded && decoded.jti) {
        await TokenService.revokeSession(decoded.jti, REVOKE_REASON.LOGOUT);
      }
    }

    await AuthLogRepository.record({
      userId,
      event: AUTH_LOG_EVENT.LOGOUT,
      success: true,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    await publisher.tokenRevoked(userId, { reason: REVOKE_REASON.LOGOUT });
    return true;
  }

  static async logoutAll(userId, context = {}) {
    const revoked = await TokenService.revokeAllSessions(userId, REVOKE_REASON.LOGOUT_ALL);

    await AuthLogRepository.record({
      userId,
      event: AUTH_LOG_EVENT.LOGOUT_ALL,
      success: true,
      reason: `${revoked} session(s) revoked`,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    await publisher.tokenRevoked(userId, { reason: REVOKE_REASON.LOGOUT_ALL, revoked });
    return { revokedSessions: revoked };
  }

  static async profile(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    return publicUser(user);
  }

static async permissions(userId) {
  const user = await UserRepository.findById(userId,{withRole: true});

  console.log("User role permissions", user);

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return user.role.permissions.map((rp) => rp.permission.code);
}


  static async changePassword(userId, { currentPassword, newPassword }, context = {}) {
    const user = await UserRepository.findById(userId, { withRole: false });
    if (!user) throw ApiError.notFound('User not found');

    const valid = await utils.password.compare(currentPassword, user.password);
    if (!valid) throw ApiError.unauthorized('Current password is incorrect');

    if (await utils.password.compare(newPassword, user.password)) {
      throw ApiError.badRequest('New password must be different from the current password');
    }

    await UserRepository.setPassword(userId, await utils.password.hash(newPassword), userId);
    await TokenService.revokeAllSessions(userId, REVOKE_REASON.PASSWORD_CHANGED);
    await PasswordResetRepository.invalidateForUser(userId);

    await AuthLogRepository.record({
      userId,
      email: user.email,
      event: AUTH_LOG_EVENT.PASSWORD_CHANGED,
      success: true,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    await emailQueue.sendPasswordChanged({
      to: user.email,
      firstName: user.firstName,
      ipAddress: context.ipAddress,
      when: new Date().toUTCString()
    });

    await publisher.passwordChanged(userId, 'SELF_SERVICE');
    return { message: 'Password changed. Please sign in again' };
  }

  /** Always returns the same response so accounts cannot be enumerated. */
  static async forgotPassword(email, context = {}) {
    const genericResponse = {
      message: 'If an account exists for this email, a reset link has been sent'
    };

    const user = await UserRepository.findByEmail(email, { withRole: false });
    if (!user || user.status !== USER_STATUS.ACTIVE) return genericResponse;

    await PasswordResetRepository.invalidateForUser(user.id);

    const token = utils.password.randomToken(32);
    await PasswordResetRepository.create({
      userId: user.id,
      tokenHash: utils.password.sha256(token),
      expiresAt: new Date(Date.now() + config.passwordReset.ttlMinutes * 60000),
      ipAddress: context.ipAddress || null
    });

    await AuthLogRepository.record({
      userId: user.id,
      email: user.email,
      event: AUTH_LOG_EVENT.PASSWORD_RESET_REQUESTED,
      success: true,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    await emailQueue.sendPasswordReset({
      to: user.email,
      firstName: user.firstName,
      resetUrl: `${config.app.url}/reset-password?token=${token}`,
      ttlMinutes: config.passwordReset.ttlMinutes
    });

    return genericResponse;
  }

  static async resetPassword({ token, newPassword }, context = {}) {
    const record = await PasswordResetRepository.findValidByHash(utils.password.sha256(token));
    if (!record) throw ApiError.badRequest('Reset link is invalid or has expired');

    const user = await UserRepository.findById(record.userId, { withRole: false });
    if (!user) throw ApiError.notFound('User not found');

    if (await utils.password.compare(newPassword, user.password)) {
      throw ApiError.badRequest('New password must be different from the previous password');
    }

    await UserRepository.setPassword(user.id, await utils.password.hash(newPassword), user.id);
    await PasswordResetRepository.markUsed(record.id);
    await TokenService.revokeAllSessions(user.id, REVOKE_REASON.PASSWORD_CHANGED);

    await AuthLogRepository.record({
      userId: user.id,
      email: user.email,
      event: AUTH_LOG_EVENT.PASSWORD_RESET_COMPLETED,
      success: true,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    await emailQueue.sendPasswordChanged({
      to: user.email,
      firstName: user.firstName,
      ipAddress: context.ipAddress,
      when: new Date().toUTCString()
    });

    await publisher.passwordChanged(user.id, 'RESET_LINK');
    return { message: 'Password reset successful. Please sign in' };
  }

  static async sendOtp({ email, purpose = OTP_PURPOSE.LOGIN }, context = {}) {
    const generic = { message: 'If an account exists for this email, an OTP has been sent' };

    const user = await UserRepository.findByEmail(email, { withRole: false });
    if (!user || user.status !== USER_STATUS.ACTIVE) return generic;

    const { code, ttlSeconds } = await OtpService.issue(purpose, email);

    await emailQueue.sendOtp({
      to: user.email,
      firstName: user.firstName,
      code,
      purpose,
      ttlMinutes: Math.round(ttlSeconds / 60)
    });

    await AuthLogRepository.record({
      userId: user.id,
      email: user.email,
      event: AUTH_LOG_EVENT.OTP_SENT,
      success: true,
      reason: purpose,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return generic;
  }

  static async verifyOtp({ email, code, purpose = OTP_PURPOSE.LOGIN }, context = {}) {
    await OtpService.verify(purpose, email, code);

    const user = await UserRepository.findByEmail(email);
    if (!user) throw ApiError.unauthorized(MESSAGES.AUTH.INVALID_CREDENTIALS);
    assertUsable(user);

    await AuthLogRepository.record({
      userId: user.id,
      email: user.email,
      event: AUTH_LOG_EVENT.OTP_VERIFIED,
      success: true,
      reason: purpose,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    if (purpose !== OTP_PURPOSE.LOGIN) return { verified: true };

    const tokens = await TokenService.issuePair(user, context);
    await UserRepository.registerSuccessfulLogin(user.id, context.ipAddress);
    await publisher.userLoggedIn(user, context);

    return { user: publicUser(user), tokens };
  }

  static async listSessions(userId) {
    return SessionRepository.listActiveByUser(userId);
  }

  static async revokeSession(userId, refreshJti) {
    const session = await SessionRepository.findByJti(refreshJti);
    if (!session || session.userId !== userId) throw ApiError.notFound('Session not found');
    await TokenService.revokeSession(refreshJti, REVOKE_REASON.LOGOUT);
    return { revoked: true };
  }

  static publicUser = publicUser;
}

module.exports = AuthService;
