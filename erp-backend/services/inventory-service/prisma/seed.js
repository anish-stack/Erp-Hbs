'use strict';
const path = require('path');
const { env } = require('@erp/shared');
env.load(path.resolve(__dirname, '..'));
const { PrismaClient } = require('../src/generated/prisma');
const { logger, constants } = require('@erp/shared');
const prisma = new PrismaClient();
const { PARTS, WAREHOUSES } = constants.DEMO;

async function main() {
  logger.info('Seeding inventory database');
  const wh = WAREHOUSES[0];
  const qtys = [1200, 800, 5000, 8000, 300];
  let n = 0;
  for (const p of PARTS) {
    const onHand = qtys[n % qtys.length];
    const avgCost = p.unitPrice;
    // composite unique is [partId, warehouseId, binLocation] (name: "position")
    const item = await prisma.stockItem.upsert({
      where: { position: { partId: p.id, warehouseId: wh.id, binLocation: 'A-01-01' } },
      update: { onHand, available: onHand, avgCost, totalValue: onHand * avgCost },
      create: {
        partId: p.id, partCode: p.partNumber, partName: p.description, warehouseId: wh.id, binLocation: 'A-01-01', uom: 'PCS',
        onHand, reserved: 0, available: onHand, avgCost, totalValue: onHand * avgCost, currencyCode: 'INR',
        minLevel: 100, reorderPoint: 250, reorderQty: 1000, maxLevel: 10000, isActive: true, lastMovementAt: new Date()
      }
    });
    if ((await prisma.stockMovement.count({ where: { stockItemId: item.id } })) === 0) {
      await prisma.stockMovement.create({
        data: { stockItemId: item.id, partId: p.id, warehouseId: wh.id, type: 'OPENING', direction: 1, quantity: onHand, balanceBefore: 0, balanceAfter: onHand, refType: 'MANUAL', note: 'Opening balance (seed)' }
      });
    }
    n++;
  }
  logger.info('Seeded stock for %d parts at %s', PARTS.length, wh.code);
}
main().then(() => prisma.$disconnect()).catch((e) => { logger.error('Seed failed: %s', e); prisma.$disconnect(); process.exit(1); });
