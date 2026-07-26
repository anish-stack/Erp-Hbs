'use strict';
const { cache } = require('@erp/shared');
const { prisma } = require('../config/prisma');
const { CACHE, ROLE_WIDGETS } = require('../constants');

function shape(l) {
  if (!l) return null;
  return { userId: l.userId, role: l.role, widgetKeys: l.widgetKeys || [], updatedAt: l.updatedAt };
}

class LayoutService {
  static async get(userId, role) {
    const existing = await prisma.dashboardLayout.findUnique({ where: { userId } });
    if (existing) return shape(existing);
    return { userId, role, widgetKeys: ROLE_WIDGETS[role] || ROLE_WIDGETS.admin, updatedAt: null };
  }

  static async save(userId, role, widgetKeys) {
    const saved = await prisma.dashboardLayout.upsert({
      where: { userId },
      update: { role, widgetKeys },
      create: { userId, role, widgetKeys }
    });
    await cache.del(CACHE.layout(userId));
    return shape(saved);
  }
}
module.exports = LayoutService;
