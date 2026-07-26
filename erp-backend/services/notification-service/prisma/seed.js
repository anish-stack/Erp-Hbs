'use strict';
const path = require('path');
const { env } = require('@erp/shared');
env.load(path.resolve(__dirname, '..'));
const { PrismaClient } = require('../src/generated/prisma');
const { logger, constants } = require('@erp/shared');
const prisma = new PrismaClient();
const { IDS } = constants.DEMO;

const ITEMS = [
  { type: 'sales.order.confirmed', category: 'SALES', priority: 'NORMAL', title: 'Order confirmed', message: 'Sales order SO-2026-00001 was confirmed.' },
  { type: 'inventory.low.stock', category: 'INVENTORY', priority: 'HIGH', title: 'Low stock alert', message: 'PJ-102AH is below reorder point at Main Warehouse.' },
  { type: 'quality.inspection.requested', category: 'QUALITY', priority: 'NORMAL', title: 'Inspection pending', message: 'INSP-0002 is awaiting inspection.' }
];

async function main() {
  logger.info('Seeding notification database');
  if ((await prisma.notification.count()) === 0) {
    for (const n of ITEMS) {
      await prisma.notification.create({
        data: { recipientId: IDS.adminUser, type: n.type, category: n.category, priority: n.priority, title: n.title, message: n.message, channels: ['IN_APP'], read: false }
      });
    }
  }
  logger.info('Seeded %d notifications', ITEMS.length);
}
main().then(() => prisma.$disconnect()).catch((e) => { logger.error('Seed failed: %s', e); prisma.$disconnect(); process.exit(1); });
