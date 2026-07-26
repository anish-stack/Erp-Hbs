'use strict';
const path = require('path');
const { env } = require('@erp/shared');
env.load(path.resolve(__dirname, '..'));
const { PrismaClient } = require('../src/generated/prisma');
const { logger, constants } = require('@erp/shared');
const prisma = new PrismaClient();
const { PARTS, CUSTOMERS, WAREHOUSES } = constants.DEMO;

async function main() {
  logger.info('Seeding shipment database');
  const cust = CUSTOMERS[0];
  if (!(await prisma.shipment.findUnique({ where: { code: 'SHP-2026-00001' } }))) {
    await prisma.shipment.create({
      data: {
        code: 'SHP-2026-00001', status: 'PENDING', orderId: 'SO-2026-00001', orderCode: 'SO-2026-00001',
        customerId: cust.id, customerName: cust.legalName, warehouseId: WAREHOUSES[0].id,
        shippingAddress: 'Tech Park, Pune, Maharashtra 400001',
        lines: { create: [
          { partId: PARTS[0].id, partCode: PARTS[0].partNumber, description: PARTS[0].description, quantity: 50 },
          { partId: PARTS[2].id, partCode: PARTS[2].partNumber, description: PARTS[2].description, quantity: 1000 }
        ] }
      }
    });
  }
  logger.info('Seeded 1 shipment');
}
main().then(() => prisma.$disconnect()).catch((e) => { logger.error('Seed failed: %s', e); prisma.$disconnect(); process.exit(1); });
