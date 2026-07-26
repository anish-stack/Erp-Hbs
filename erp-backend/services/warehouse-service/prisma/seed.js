'use strict';
const path = require('path');
const { env } = require('@erp/shared');
env.load(path.resolve(__dirname, '..'));
const { PrismaClient } = require('../src/generated/prisma');
const { logger, constants } = require('@erp/shared');
const prisma = new PrismaClient();
const { WAREHOUSES } = constants.DEMO;

async function main() {
  logger.info('Seeding warehouse database');
  let i = 0;
  for (const w of WAREHOUSES) {
    await prisma.warehouse.upsert({
      where: { code: w.code },
      update: { name: w.name },
      create: {
        id: w.id, code: w.code, name: w.name, type: i === 0 ? 'MAIN' : 'BRANCH', status: 'ACTIVE',
        addressLine1: 'Plot 21, Logistics Zone', city: w.city, state: i === 0 ? 'Delhi' : 'Karnataka',
        pincode: '110015', country: 'India', isDefault: w.isDefault, timezone: 'Asia/Kolkata'
      }
    });
    // one storage zone + a few bins
    let zone = await prisma.zone.findFirst({ where: { warehouseId: w.id, code: 'Z-STORAGE' } });
    if (!zone) zone = await prisma.zone.create({ data: { warehouseId: w.id, code: 'Z-STORAGE', name: 'Storage', type: 'STORAGE' } });
    if ((await prisma.bin.count({ where: { warehouseId: w.id } })) === 0) {
      for (const b of ['A-01-01', 'A-01-02', 'A-02-01']) {
        await prisma.bin.create({
          data: { warehouseId: w.id, zoneId: zone.id, code: b, aisle: 'A', rack: b.split('-')[1], shelf: b.split('-')[2], binType: 'SHELF', status: 'AVAILABLE', isPickable: true }
        });
      }
    }
    i++;
  }
  logger.info('Seeded %d warehouses (+ zone + bins)', WAREHOUSES.length);
}
main().then(() => prisma.$disconnect()).catch((e) => { logger.error('Seed failed: %s', e); prisma.$disconnect(); process.exit(1); });
