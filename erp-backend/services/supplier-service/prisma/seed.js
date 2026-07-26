'use strict';
const path = require('path');
const { env } = require('@erp/shared');
env.load(path.resolve(__dirname, '..'));
const { PrismaClient } = require('../src/generated/prisma');
const { logger, constants } = require('@erp/shared');
const prisma = new PrismaClient();
const { SUPPLIERS } = constants.DEMO;

async function main() {
  logger.info('Seeding supplier database');
  const types = ['AUTHORISED_DISTRIBUTOR', 'DISTRIBUTOR', 'TRADER'];
  let i = 0;
  for (const s of SUPPLIERS) {
    await prisma.supplier.upsert({
      where: { code: s.code },
      update: { legalName: s.legalName, status: 'APPROVED' },
      create: {
        id: s.id, code: s.code, legalName: s.legalName, tradeName: s.legalName.split(' ')[0],
        type: types[i % types.length], status: 'APPROVED', taxTreatment: 'REGISTERED',
        gstin: s.gstin, email: s.email, phone: '+91 98100 0000' + i,
        currencyCode: 'INR', paymentTermDays: 30, creditLimit: 1000000,
        riskLevel: 'LOW', isPreferred: i === 0, approvedAt: new Date()
      }
    });
    if ((await prisma.supplierAddress.count({ where: { supplierId: s.id } })) === 0) {
      await prisma.supplierAddress.create({
        data: { supplierId: s.id, type: 'REGISTERED', line1: `${i + 12}, Industrial Area`, city: s.city, state: s.state, pincode: '110015', country: 'India' }
      });
    }
    if ((await prisma.supplierContact.count({ where: { supplierId: s.id } })) === 0) {
      await prisma.supplierContact.create({
        data: { supplierId: s.id, name: 'Sales Desk', department: 'SALES', email: s.email, phone: '+91 98100 0000' + i }
      });
    }
    i++;
  }
  logger.info('Seeded %d suppliers (+ address + contact each)', SUPPLIERS.length);
}
main().then(() => prisma.$disconnect()).catch((e) => { logger.error('Seed failed: %s', e); prisma.$disconnect(); process.exit(1); });
