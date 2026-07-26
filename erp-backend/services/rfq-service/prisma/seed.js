'use strict';
const path = require('path');
const { env } = require('@erp/shared');
env.load(path.resolve(__dirname, '..'));
const { PrismaClient } = require('../src/generated/prisma');
const { logger, constants } = require('@erp/shared');
const prisma = new PrismaClient();
const { PARTS, SUPPLIERS } = constants.DEMO;

async function main() {
  logger.info('Seeding rfq database');
  if (!(await prisma.rfq.findUnique({ where: { code: 'RFQ-2026-00001' } }))) {
    await prisma.rfq.create({
      data: {
        code: 'RFQ-2026-00001', title: 'Q1 MCU + passives sourcing', requestedBy: 'seed', status: 'SENT',
        lines: { create: [
          { lineNumber: 1, partId: PARTS[0].id, partNumber: PARTS[0].partNumber, description: PARTS[0].description, quantity: 1000, uomCode: 'PCS', targetPrice: PARTS[0].unitPrice },
          { lineNumber: 2, partId: PARTS[2].id, partNumber: PARTS[2].partNumber, description: PARTS[2].description, quantity: 5000, uomCode: 'PCS', targetPrice: PARTS[2].unitPrice }
        ] },
        suppliers: { create: [
          { supplierId: SUPPLIERS[0].id, supplierCode: SUPPLIERS[0].code, supplierName: SUPPLIERS[0].legalName, status: 'PENDING', invitedAt: new Date() },
          { supplierId: SUPPLIERS[1].id, supplierCode: SUPPLIERS[1].code, supplierName: SUPPLIERS[1].legalName, status: 'PENDING', invitedAt: new Date() }
        ] }
      }
    });
  }
  logger.info('Seeded 1 RFQ (2 lines, 2 suppliers)');
}
main().then(() => prisma.$disconnect()).catch((e) => { logger.error('Seed failed: %s', e); prisma.$disconnect(); process.exit(1); });
