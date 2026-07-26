'use strict';
const { ApiError, utils, cache } = require('@erp/shared');
const { prisma } = require('../config/prisma');
const NotificationRepository = require('../repositories/notification.repository');
const PreferenceRepository = require('../repositories/preference.repository');
const io = require('../sockets/io');
const mail = require('../providers/mail.provider');
const sms = require('../providers/sms.provider');
const templates = require('./template.service');
const { DELIVERY_CHANNEL, DELIVERY_STATUS, CACHE } = require('../constants');

function shapeDelivery(d) {
  return { id: d.id, channel: d.channel, status: d.status, target: d.target, error: d.error, sentAt: d.sentAt };
}

function shape(n) {
  if (!n) return null;
  return {
    id: n.id, recipientId: n.recipientId, audienceRole: n.audienceRole,
    type: n.type, category: n.category, priority: n.priority,
    title: n.title, message: n.message, data: n.data,
    channels: n.channels, read: n.read, readAt: n.readAt,
    sourceEvent: n.sourceEvent, sourceId: n.sourceId,
    deliveries: n.deliveries ? n.deliveries.map(shapeDelivery) : undefined,
    createdAt: n.createdAt
  };
}

/**
 * Creates a notification record and fans it out across requested channels:
 * IN_APP pushes over Socket.IO immediately; EMAIL/SMS go through the
 * providers (both are safe no-ops until configured) and record a Delivery
 * row either way so the outbox is auditable.
 */
async function dispatch({ recipientId, audienceRole, type, category, priority, title, message, data, channels, sourceEvent, sourceId, recipientContact }) {
  const notification = await NotificationRepository.create({
    recipientId: recipientId || null,
    audienceRole: audienceRole || null,
    type, category, priority, title, message,
    data: data || {},
    channels,
    sourceEvent: sourceEvent || null,
    sourceId: sourceId || null
  });

  let prefs = null;
  if (recipientId) prefs = await PreferenceRepository.findByUser(recipientId).catch(() => null);

  for (const channel of channels) {
    if (channel === DELIVERY_CHANNEL.IN_APP) {
      if (prefs && prefs.inAppEnabled === false) continue;
      if (recipientId) io.toUser(recipientId, 'notification', shape(notification));
      else if (audienceRole) io.toRole(audienceRole, 'notification', shape(notification));
      else io.toAll('notification', shape(notification));

      await recordDelivery(notification.id, DELIVERY_CHANNEL.IN_APP, DELIVERY_STATUS.SENT, recipientId || audienceRole || 'broadcast');
      continue;
    }

    if (channel === DELIVERY_CHANNEL.EMAIL) {
      if (prefs && prefs.emailEnabled === false) { await recordDelivery(notification.id, channel, DELIVERY_STATUS.SKIPPED, null, 'User opted out'); continue; }
      const to = recipientContact?.email || (prefs && prefs.email) || null;
      const result = await mail.sendMail({ to, subject: title, text: message });
      await recordDelivery(notification.id, channel, result.sent ? DELIVERY_STATUS.SENT : DELIVERY_STATUS.FAILED, to, result.error, result.providerRef);
      continue;
    }

    if (channel === DELIVERY_CHANNEL.SMS) {
      if (prefs && prefs.smsEnabled === false) { await recordDelivery(notification.id, channel, DELIVERY_STATUS.SKIPPED, null, 'User opted out'); continue; }
      const to = recipientContact?.phone || (prefs && prefs.phone) || null;
      const result = await sms.sendSms({ to, message: `${title}: ${message}` });
      await recordDelivery(notification.id, channel, result.sent ? DELIVERY_STATUS.SENT : DELIVERY_STATUS.FAILED, to, result.error, result.providerRef);
    }
  }

  if (recipientId) await cache.del(CACHE.unreadCount(recipientId));
  return NotificationService.getById(notification.id);
}

async function recordDelivery(notificationId, channel, status, target, error, providerRef) {
  return prisma.delivery.create({
    data: { notificationId, channel, status, target: target || null, error: error || null, providerRef: providerRef || null, attempts: 1, sentAt: status === DELIVERY_STATUS.SENT ? new Date() : null }
  });
}

class NotificationService {
  static dispatch = dispatch;

  static async list(query, recipientId) {
    const pagination = utils.pagination.buildPagination(query, { allowedSortFields: ['createdAt'], defaultSortField: 'createdAt' });
    const where = {
      recipientId,
      ...(query.read !== undefined ? { read: query.read } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.type ? { type: { startsWith: query.type } } : {})
    };
    const { items, total } = await NotificationRepository.paginate({ where, skip: pagination.skip, take: pagination.take, orderBy: pagination.orderBy });
    return { items: items.map(shape), total, page: pagination.page, limit: pagination.limit };
  }

  static async getById(id) {
    const n = await NotificationRepository.findById(id);
    if (!n) throw ApiError.notFound('Notification not found');
    return shape(n);
  }

  static async markRead(id, recipientId) {
    const n = await NotificationRepository.findById(id);
    if (!n) throw ApiError.notFound('Notification not found');
    if (recipientId && n.recipientId !== recipientId) throw ApiError.forbidden('Not your notification');
    const updated = await NotificationRepository.markRead(id);
    await cache.del(CACHE.unreadCount(recipientId));
    return shape(updated);
  }

  static async markAllRead(recipientId) {
    const result = await NotificationRepository.markAllRead(recipientId);
    await cache.del(CACHE.unreadCount(recipientId));
    return { updated: result.count };
  }

  static async unreadCount(recipientId) {
    return cache.remember(CACHE.unreadCount(recipientId), 30, () => NotificationRepository.unreadCount(recipientId));
  }

  static async purgeOld(days) {
    const before = new Date(Date.now() - days * 86400 * 1000);
    const result = await NotificationRepository.purgeOlderThan(before);
    return { purged: result.count };
  }

  static shape = shape;
}
module.exports = NotificationService;
