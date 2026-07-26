'use strict';
const path = require('path');
const { env } = require('@erp/shared');
env.load(path.resolve(__dirname, '..'));
const { PrismaClient } = require('../src/generated/prisma');
const { logger, constants } = require('@erp/shared');
const prisma = new PrismaClient();
const { PARTS, CUSTOMERS, SUPPLIERS, SELLER } = constants.DEMO;

async function main() {
  logger.info('Seeding finance database');
  const cust = CUSTOMERS[0];
  const p0 = PARTS[0], p2 = PARTS[2];

  // AR (SALES) invoice — intra-state (Delhi seller + Delhi customer) => CGST+SGST
  const l1 = { partId: p0.id, partCode: p0.partNumber, description: p0.description, quantity: 50, unitPrice: p0.unitPrice };
  const l2 = { partId: p2.id, partCode: p2.partNumber, description: p2.description, quantity: 1000, unitPrice: p2.unitPrice };
  const taxable = l1.quantity * l1.unitPrice + l2.quantity * l2.unitPrice;
  const tax = +(taxable * 0.18).toFixed(2), cgst = +(tax / 2).toFixed(2), sgst = +(tax / 2).toFixed(2);
  const grand = +(taxable + tax).toFixed(2);
  if (!(await prisma.invoice.findUnique({ where: { code: 'INV-S-2026-00001' } }))) {
    await prisma.invoice.create({
      data: {
        code: 'INV-S-2026-00001', type: 'SALES', status: 'ISSUED', partyType: 'CUSTOMER', partyId: cust.id, partyName: cust.legalName,
        sourceType: 'SALES_ORDER', sourceCode: 'SO-2026-00001', currencyCode: 'INR', invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 864e5), placeOfSupply: '07', sellerGstin: SELLER.gstin, buyerGstin: cust.gstin,
        interState: false, subtotal: taxable, taxableTotal: taxable, cgstTotal: cgst, sgstTotal: sgst, igstTotal: 0,
        taxTotal: tax, grandTotal: grand, amountPaid: 0, amountDue: grand, issuedAt: new Date(),
        lines: { create: [
          { ...l1, taxRatePct: 18, taxableValue: l1.quantity * l1.unitPrice, cgst: +(l1.quantity * l1.unitPrice * 0.09).toFixed(2), sgst: +(l1.quantity * l1.unitPrice * 0.09).toFixed(2), igst: 0, lineTotal: +(l1.quantity * l1.unitPrice * 1.18).toFixed(2) },
          { ...l2, taxRatePct: 18, taxableValue: l2.quantity * l2.unitPrice, cgst: +(l2.quantity * l2.unitPrice * 0.09).toFixed(2), sgst: +(l2.quantity * l2.unitPrice * 0.09).toFixed(2), igst: 0, lineTotal: +(l2.quantity * l2.unitPrice * 1.18).toFixed(2) }
        ] }
      }
    });
  }

  // AP (PURCHASE) invoice
  const sup = SUPPLIERS[0];
  const apTaxable = 1000 * PARTS[0].unitPrice;
  const apTax = +(apTaxable * 0.18).toFixed(2);
  if (!(await prisma.invoice.findUnique({ where: { code: 'INV-P-2026-00001' } }))) {
    await prisma.invoice.create({
      data: {
        code: 'INV-P-2026-00001', type: 'PURCHASE', status: 'ISSUED', partyType: 'SUPPLIER', partyId: sup.id, partyName: sup.legalName,
        sourceType: 'PURCHASE_ORDER', sourceCode: 'PO-2026-00001', currencyCode: 'INR', invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 864e5), interState: false, subtotal: apTaxable, taxableTotal: apTaxable,
        cgstTotal: +(apTax / 2).toFixed(2), sgstTotal: +(apTax / 2).toFixed(2), igstTotal: 0, taxTotal: apTax,
        grandTotal: +(apTaxable + apTax).toFixed(2), amountPaid: 0, amountDue: +(apTaxable + apTax).toFixed(2), issuedAt: new Date(),
        lines: { create: [{ partId: PARTS[0].id, partCode: PARTS[0].partNumber, description: PARTS[0].description, quantity: 1000, unitPrice: PARTS[0].unitPrice, taxRatePct: 18, taxableValue: apTaxable, cgst: +(apTax / 2).toFixed(2), sgst: +(apTax / 2).toFixed(2), igst: 0, lineTotal: +(apTaxable + apTax).toFixed(2) }] }
      }
    });
  }
  logger.info('Seeded 1 AR + 1 AP invoice');
}
main().then(() => prisma.$disconnect()).catch((e) => { logger.error('Seed failed: %s', e); prisma.$disconnect(); process.exit(1); });
