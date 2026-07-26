'use strict';
const path = require('path');
const { env } = require('@erp/shared');
env.load(path.resolve(__dirname, '..'));
const { PrismaClient } = require('../src/generated/prisma');
const { logger, constants } = require('@erp/shared');
const prisma = new PrismaClient();
const { CUSTOMERS } = constants.DEMO;

const LEADS = [
  { code: 'LEAD-0001', companyName: 'Skyline Automation', contactName: 'Rohit Mehra', email: 'rohit@skyline.in', source: 'WEBSITE', stage: 'QUALIFIED', estimatedValue: 250000, city: 'Delhi', state: 'Delhi' },
  { code: 'LEAD-0002', companyName: 'Delta Drones', contactName: 'Ananya Rao', email: 'ananya@deltadrones.in', source: 'REFERRAL', stage: 'PROPOSAL', estimatedValue: 400000, city: 'Hyderabad', state: 'Telangana' },
  { code: 'LEAD-0003', companyName: 'Circuit Junction', contactName: 'Imran Sheikh', email: 'imran@circuitjn.in', source: 'EXHIBITION', stage: 'NEW', estimatedValue: 120000, city: 'Mumbai', state: 'Maharashtra' }
];

async function main() {
  logger.info('Seeding crm database');
  const segs = ['SMB', 'ENTERPRISE', 'STARTUP'];
  let i = 0;
  for (const c of CUSTOMERS) {
    await prisma.customer.upsert({
      where: { code: c.code },
      update: { legalName: c.legalName, status: 'ACTIVE' },
      create: {
        id: c.id, code: c.code, legalName: c.legalName, tradeName: c.legalName.split(' ')[0],
        type: 'BUSINESS', status: 'ACTIVE', taxTreatment: 'REGISTERED', gstin: c.gstin, email: c.email,
        phone: '+91 99900 0000' + i, currencyCode: 'INR', paymentTermDays: 30,
        creditLimit: c.creditLimit, creditUsed: 0, segment: segs[i % segs.length], industry: 'Electronics'
      }
    });
    if ((await prisma.customerAddress.count({ where: { customerId: c.id } })) === 0) {
      await prisma.customerAddress.create({
        data: { customerId: c.id, type: 'BILLING', line1: `${i + 5}, Tech Park`, city: c.city, state: c.state, pincode: '400001', country: 'India' }
      });
    }
    i++;
  }
  for (const l of LEADS) {
    await prisma.lead.upsert({
      where: { code: l.code },
      update: { stage: l.stage },
      create: { ...l, currencyCode: 'INR', country: 'India', probability: 40 }
    });
  }
  logger.info('Seeded %d customers + %d leads', CUSTOMERS.length, LEADS.length);
}
main().then(() => prisma.$disconnect()).catch((e) => { logger.error('Seed failed: %s', e); prisma.$disconnect(); process.exit(1); });
