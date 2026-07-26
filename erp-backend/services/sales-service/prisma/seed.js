'use strict';
const path = require('path');
const { env } = require('@erp/shared');
env.load(path.resolve(__dirname, '..'));
const { PrismaClient } = require('../src/generated/prisma');
const { logger, constants } = require('@erp/shared');
const prisma = new PrismaClient();
const { PARTS, CUSTOMERS, WAREHOUSES } = constants.DEMO;

function lines(specs) {
  return specs.map((s) => {
    const p = PARTS[s.i];
    const lineTotal = s.qty * p.unitPrice;
    return { partId: p.id, partCode: p.partNumber, description: p.description, quantity: s.qty, unitPrice: p.unitPrice, taxRatePct: 18, lineTotal };
  });
}
const sum = (ls) => ls.reduce((a, l) => a + Number(l.lineTotal), 0);

async function main() {
  logger.info('Seeding sales database');
  const cust = CUSTOMERS[0];

  // Quotation (SENT)
  const qLines = lines([{ i: 0, qty: 100 }, { i: 1, qty: 200 }]);
  const qSub = sum(qLines), qTax = qSub * 0.18;
  if (!(await prisma.quotation.findUnique({ where: { code: 'QT-2026-00001' } }))) {
    await prisma.quotation.create({
      data: {
        code: 'QT-2026-00001', status: 'SENT', customerId: cust.id, customerName: cust.legalName, currencyCode: 'INR',
        quoteDate: new Date(), validUntil: new Date(Date.now() + 15 * 864e5),
        subtotal: qSub, discountTotal: 0, taxTotal: qTax, grandTotal: qSub + qTax, lines: { create: qLines }
      }
    });
  }

  // Sales order (CONFIRMED)
  const oLines = lines([{ i: 0, qty: 50 }, { i: 2, qty: 1000 }]);
  const oSub = sum(oLines), oTax = oSub * 0.18;
  if (!(await prisma.salesOrder.findUnique({ where: { code: 'SO-2026-00001' } }))) {
    await prisma.salesOrder.create({
      data: {
        code: 'SO-2026-00001', status: 'CONFIRMED', customerId: cust.id, customerName: cust.legalName, currencyCode: 'INR',
        orderDate: new Date(), warehouseId: WAREHOUSES[0].id, subtotal: oSub, discountTotal: 0, taxTotal: oTax,
        grandTotal: oSub + oTax, paymentTermDays: 30, reserved: true, confirmedAt: new Date(),
        lines: { create: oLines.map((l) => ({ ...l, reservedQty: l.quantity })) }
      }
    });
  }
  logger.info('Seeded 1 quotation + 1 sales order');
}
main().then(() => prisma.$disconnect()).catch((e) => { logger.error('Seed failed: %s', e); prisma.$disconnect(); process.exit(1); });
