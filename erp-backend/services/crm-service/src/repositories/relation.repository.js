'use strict';

const { prisma } = require('../config/prisma');

class RelationRepository {
  static async createAddress(data) { return prisma.customerAddress.create({ data }); }
  static async updateAddress(id, data) { return prisma.customerAddress.update({ where: { id }, data }); }
  static async deleteAddress(id) { return prisma.customerAddress.update({ where: { id }, data: { deletedAt: new Date() } }); }
  static async findAddress(id) { return prisma.customerAddress.findFirst({ where: { id, deletedAt: null } }); }
  static async clearPrimaryAddress(customerId, type) {
    return prisma.customerAddress.updateMany({ where: { customerId, type, isPrimary: true }, data: { isPrimary: false } });
  }

  static async createContact(data) { return prisma.customerContact.create({ data }); }
  static async updateContact(id, data) { return prisma.customerContact.update({ where: { id }, data }); }
  static async deleteContact(id) { return prisma.customerContact.update({ where: { id }, data: { deletedAt: new Date() } }); }
  static async findContact(id) { return prisma.customerContact.findFirst({ where: { id, deletedAt: null } }); }
  static async clearPrimaryContact(customerId) {
    return prisma.customerContact.updateMany({ where: { customerId, isPrimary: true }, data: { isPrimary: false } });
  }

  static async createActivity(data) { return prisma.activity.create({ data }); }
  static async updateActivity(id, data) { return prisma.activity.update({ where: { id }, data }); }
  static async findActivity(id) { return prisma.activity.findUnique({ where: { id } }); }
  static async listActivities(where, { skip, take }) {
    const [items, total] = await prisma.$transaction([
      prisma.activity.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.activity.count({ where })
    ]);
    return { items, total };
  }

  static async createCreditLog(data) { return prisma.creditLog.create({ data }); }
}

module.exports = RelationRepository;
