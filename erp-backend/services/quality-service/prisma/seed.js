'use strict';
const path = require('path');
const { env } = require('@erp/shared');
env.load(path.resolve(__dirname, '..'));
const { PrismaClient } = require('../src/generated/prisma');
const { logger, constants } = require('@erp/shared');
const prisma = new PrismaClient();
const { PARTS, SUPPLIERS, WAREHOUSES } = constants.DEMO;

async function main() {
  logger.info('Seeding quality database');
  await prisma.inspectionPlan.upsert({
    where: { code: 'QP-STD' },
    update: { name: 'Standard Incoming Plan' },
    create: { code: 'QP-STD', name: 'Standard Incoming Plan', description: 'Visual + electrical spot check', samplingPlan: 'SAMPLE', isActive: true }
  });
  // one completed (passed) + one pending inspection
  const p0 = PARTS[0], p1 = PARTS[1];
  await prisma.inspection.upsert({
    where: { code: 'INSP-0001' },
    update: {},
    create: {
      code: 'INSP-0001', type: 'INCOMING', status: 'PASSED', partId: p0.id, partCode: p0.partNumber, partName: p0.description,
      supplierId: SUPPLIERS[0].id, warehouseId: WAREHOUSES[0].id, receivedQty: 1000, sampleSize: 50, inspectedQty: 50,
      acceptedQty: 1000, rejectedQty: 0, unitCost: p0.unitPrice, disposition: 'ACCEPT', completedAt: new Date()
    }
  });
  await prisma.inspection.upsert({
    where: { code: 'INSP-0002' },
    update: {},
    create: {
      code: 'INSP-0002', type: 'INCOMING', status: 'PENDING', partId: p1.id, partCode: p1.partNumber, partName: p1.description,
      supplierId: SUPPLIERS[1].id, warehouseId: WAREHOUSES[0].id, receivedQty: 500, unitCost: p1.unitPrice
    }
  });
  logger.info('Seeded 1 plan + 2 inspections');
}
main().then(() => prisma.$disconnect()).catch((e) => { logger.error('Seed failed: %s', e); prisma.$disconnect(); process.exit(1); });
