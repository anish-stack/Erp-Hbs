'use strict';

const { prisma } = require('../config/prisma');

class SessionRepository {
  static async create(data) {
    return prisma.userSession.create({ data });
  }

  static async findByJti(refreshJti) {
    return prisma.userSession.findUnique({ where: { refreshJti } });
  }

  static async listActiveByUser(userId) {
    return prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        refreshJti: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true
      }
    });
  }

  static async revokeByJti(refreshJti, reason, replacedById = null) {
    return prisma.userSession.updateMany({
      where: { refreshJti, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason, replacedById }
    });
  }

  static async revokeFamily(familyId, reason) {
    return prisma.userSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason }
    });
  }

  static async revokeAllForUser(userId, reason) {
    return prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason }
    });
  }

  static async activeJtisForUser(userId) {
    const sessions = await prisma.userSession.findMany({
      where: { userId, revokedAt: null },
      select: { accessJti: true, refreshJti: true, expiresAt: true }
    });
    return sessions;
  }

  /** Rotation is atomic: old session revoked and new one created together. */
  static async rotate({ oldJti, newSession }) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.userSession.create({ data: newSession });
      await tx.userSession.updateMany({
        where: { refreshJti: oldJti, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'ROTATED', replacedById: created.id }
      });
      return created;
    });
  }

  static async purgeExpired(before = new Date()) {
    const result = await prisma.userSession.deleteMany({
      where: { expiresAt: { lt: before } }
    });
    return result.count;
  }
}

module.exports = SessionRepository;
