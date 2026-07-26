'use strict';

const { prisma } = require('../config/prisma');

class PasswordResetRepository {
  static async create(data) {
    return prisma.passwordReset.create({ data });
  }

  static async findValidByHash(tokenHash) {
    return prisma.passwordReset.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } }
    });
  }

  static async markUsed(id) {
    return prisma.passwordReset.update({
      where: { id },
      data: { usedAt: new Date() }
    });
  }

  static async invalidateForUser(userId) {
    return prisma.passwordReset.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() }
    });
  }
}

module.exports = PasswordResetRepository;
