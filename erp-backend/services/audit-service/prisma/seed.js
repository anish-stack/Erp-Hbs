'use strict';
const path = require('path');
const crypto = require('crypto');
const { env } = require('@erp/shared');
env.load(path.resolve(__dirname, '..'));
const { PrismaClient } = require('../src/generated/prisma');
const { logger, constants } = require('@erp/shared');
const prisma = new PrismaClient();
const { IDS } = constants.DEMO;

const ITEMS = [
  { event: 'auth.user.login', source: 'auth-service', channel: 'API', entity: 'User', action: 'LOGIN', summary: 'Admin signed in' },
  { event: 'sales.order.confirmed', source: 'sales-service', channel: 'EVENT', entity: 'SalesOrder', entityId: 'SO-2026-00001', action: 'STATUS_CHANGE', summary: 'Order SO-2026-00001 confirmed' },
  { event: 'supplier.approved', source: 'supplier-service', channel: 'EVENT', entity: 'Supplier', action: 'APPROVE', summary: 'Supplier SUP-0001 approved' }
];

async function main() {
  logger.info('Seeding audit database');
  if ((await prisma.auditLog.count()) === 0) {
    for (const a of ITEMS) {
      await prisma.auditLog.create({
        data: { eventId: crypto.randomUUID(), event: a.event, source: a.source, channel: a.channel, entity: a.entity, entityId: a.entityId, action: a.action, severity: 'INFO', actorId: IDS.adminUser, actorEmail: 'admin@erp.local', actorRole: 'admin', summary: a.summary, occurredAt: new Date() }
      });
    }
  }
  logger.info('Seeded %d audit logs', ITEMS.length);
}
main().then(() => prisma.$disconnect()).catch((e) => { logger.error('Seed failed: %s', e); prisma.$disconnect(); process.exit(1); });
