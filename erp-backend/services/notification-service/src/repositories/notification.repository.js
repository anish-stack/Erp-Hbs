'use strict';
const { prisma } = require('../config/prisma');
const DETAIL = { deliveries: true };

class NotificationRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.notification.findMany({ where, skip, take, orderBy, include: DETAIL }),
      prisma.notification.count({ where })
    ]);
    return { items, total };
  }
  static findById(id) { return prisma.notification.findUnique({ where: { id }, include: DETAIL }); }
  static create(data) { return prisma.notification.create({ data, include: DETAIL }); }
  static markRead(id) { return prisma.notification.update({ where: { id }, data: { read: true, readAt: new Date() } }); }
  static markAllRead(recipientId) {
    return prisma.notification.updateMany({ where: { recipientId, read: false }, data: { read: true, readAt: new Date() } });
  }
  static unreadCount(recipientId) {
    return prisma.notification.count({ where: { recipientId, read: false } });
  }
  static purgeOlderThan(before) {
    return prisma.notification.deleteMany({ where: { createdAt: { lt: before }, read: true } });
  }
}
module.exports = NotificationRepository;
