'use strict';

const { prisma } = require('../config/prisma');

class SettingRepository {
  static async all(groupName = null) {
    return prisma.setting.findMany({
      where: groupName ? { groupName } : {},
      orderBy: [{ groupName: 'asc' }, { key: 'asc' }]
    });
  }

  static async publicOnly() {
    return prisma.setting.findMany({ where: { isPublic: true }, orderBy: { key: 'asc' } });
  }

  static async findByKey(key) {
    return prisma.setting.findUnique({ where: { key } });
  }

  static async upsert(key, data, actorId) {
    return prisma.setting.upsert({
      where: { key },
      update: { ...data, updatedBy: actorId },
      create: { key, ...data, updatedBy: actorId }
    });
  }

  static async updateValue(key, value, actorId) {
    return prisma.setting.update({ where: { key }, data: { value, updatedBy: actorId } });
  }

  static async groups() {
    const rows = await prisma.setting.findMany({
      distinct: ['groupName'],
      select: { groupName: true },
      orderBy: { groupName: 'asc' }
    });
    return rows.map((row) => row.groupName);
  }
}

module.exports = SettingRepository;
