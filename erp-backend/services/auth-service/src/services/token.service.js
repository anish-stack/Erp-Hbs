'use strict';

const { randomUUID } = require('crypto');
const { utils, cache, constants, logger } = require('@erp/shared');
const SessionRepository = require('../repositories/session.repository');
const config = require('../config');
const { REVOKE_REASON } = require('../constants');

const CACHE_KEYS = constants.CACHE_KEYS;

function parseDuration(value, fallbackSeconds) {
  const match = /^(\d+)([smhd])$/.exec(String(value).trim());
  if (!match) return fallbackSeconds;
  const amount = Number(match[1]);
  const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]];
  return amount * unit;
}

function accessTtlSeconds() {
  return parseDuration(process.env.JWT_ACCESS_EXPIRES_IN || '15m', 900);
}

function refreshTtlSeconds() {
  return parseDuration(process.env.JWT_REFRESH_EXPIRES_IN || '7d', 604800);
}

function buildClaims(user) {
  const permissions = (user.role.permissions || []).map((rp) => rp.permission.code);
  return {
    sub: user.id,
    email: user.email,
    employeeCode: user.employeeCode,
    roleId: user.role.id,
    role: user.role.code,
    departmentId: user.departmentId || null,
    permissions
  };
}

class TokenService {
  /** Issues an access + refresh pair and persists the refresh session. */
  static async issuePair(user, context = {}, familyId = null) {
    const claims = buildClaims(user);
    const access = utils.jwt.signAccessToken(claims);
    const refresh = utils.jwt.signRefreshToken({ sub: user.id, familyId: familyId || randomUUID() });

    const decodedRefresh = utils.jwt.decode(refresh.token);
    const session = {
      userId: user.id,
      familyId: familyId || decodedRefresh.familyId,
      refreshJti: refresh.jti,
      tokenHash: utils.password.sha256(refresh.token),
      accessJti: access.jti,
      userAgent: (context.userAgent || '').slice(0, 255) || null,
      ipAddress: context.ipAddress || null,
      expiresAt: new Date(Date.now() + refreshTtlSeconds() * 1000)
    };

    if (context.rotateFromJti) {
      await SessionRepository.rotate({ oldJti: context.rotateFromJti, newSession: session });
    } else {
      await SessionRepository.create(session);
    }

    await cache.set(
      CACHE_KEYS.userPermissions(user.id),
      claims.permissions,
      config.security.permissionCacheTtl
    );

    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      tokenType: 'Bearer',
      expiresIn: accessTtlSeconds(),
      refreshExpiresIn: refreshTtlSeconds(),
      familyId: session.familyId
    };
  }

  /** Blacklists an access token jti for its remaining lifetime. */
  static async blacklistAccessJti(jti, ttlSeconds = accessTtlSeconds()) {
    if (!jti) return false;
    await cache.set(CACHE_KEYS.tokenBlacklist(jti), '1', ttlSeconds);
    return true;
  }

  static async revokeSession(refreshJti, reason = REVOKE_REASON.LOGOUT) {
    const session = await SessionRepository.findByJti(refreshJti);
    if (!session) return null;
    await SessionRepository.revokeByJti(refreshJti, reason);
    if (session.accessJti) await TokenService.blacklistAccessJti(session.accessJti);
    return session;
  }

  static async revokeFamily(familyId, reason) {
    const sessions = await SessionRepository.revokeFamily(familyId, reason);
    logger.warn('Revoked session family %s (%s)', familyId, reason);
    return sessions;
  }

  /** Revokes every active session of a user and blacklists their access tokens. */
  static async revokeAllSessions(userId, reason) {
    const sessions = await SessionRepository.activeJtisForUser(userId);
    await SessionRepository.revokeAllForUser(userId, reason);
    await Promise.all(
      sessions
        .filter((session) => session.accessJti)
        .map((session) => TokenService.blacklistAccessJti(session.accessJti))
    );
    await cache.del(CACHE_KEYS.userPermissions(userId));
    return sessions.length;
  }

  static accessTtlSeconds = accessTtlSeconds;
  static refreshTtlSeconds = refreshTtlSeconds;
  static buildClaims = buildClaims;
}

module.exports = TokenService;
