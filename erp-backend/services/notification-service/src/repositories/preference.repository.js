'use strict';
const { prisma } = require('../config/prisma');

class PreferenceRepository {
  static findByUser(userId) { return prisma.notificationPreference.findUnique({ where: { userId } }); }
  static upsert(userId, data) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data }
    });
  }
}
module.exports = PreferenceRepository;
