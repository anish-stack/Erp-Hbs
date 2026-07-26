'use strict';
const path = require('path');
const { env } = require('@erp/shared');
env.load(path.resolve(__dirname, '..'));
const { PrismaClient } = require('../src/generated/prisma');
const { logger, constants } = require('@erp/shared');
const prisma = new PrismaClient();
const { PARTS, SUPPLIERS } = constants.DEMO;

async function main() {
  logger.info('Seeding purchase database');
  const sup = SUPPLIERS[0];
  const lines = [
    { partIdx: 0, qty: 1000 }, { partIdx: 2, qty: 5000 }
  ].map((l, idx) => {
    const p = PARTS[l.partIdx];
    return { lineNumber: idx + 1, partId: p.id, partNumber: p.partNumber, description: p.description, quantity: l.qty, uomCode: 'PCS', unitPrice: p.unitPrice, lineTotal: l.qty * p.unitPrice };
  });
  const subTotal = lines.reduce((s, l) => s + Number(l.lineTotal), 0);
  const taxTotal = subTotal * 0.18;

  const existing = await prisma.purchaseOrder.findUnique({ where: { code: 'PO-2026-00001' } });
  if (!existing) {
    await prisma.purchaseOrder.create({
      data: {
        code: 'PO-2026-00001', supplierId: sup.id, supplierCode: sup.code, supplierName: sup.legalName,
        status: 'APPROVED', currencyCode: 'INR', paymentTermDays: 30, expectedDate: new Date(Date.now() + 7 * 864e5),
        subTotal, taxTotal, grandTotal: subTotal + taxTotal, requestedBy: 'seed', approvedAt: new Date(),
        lines: { create: lines }
      }
    });
  }
  logger.info('Seeded 1 purchase order with %d lines', lines.length);
}
main().then(() => prisma.$disconnect()).catch((e) => { logger.error('Seed failed: %s', e); prisma.$disconnect(); process.exit(1); });
