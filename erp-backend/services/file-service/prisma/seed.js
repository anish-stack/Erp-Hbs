'use strict';
const path = require('path');
const { env } = require('@erp/shared');
env.load(path.resolve(__dirname, '..'));
const { PrismaClient } = require('../src/generated/prisma');
const { logger, constants } = require('@erp/shared');
const prisma = new PrismaClient();
const { IDS } = constants.DEMO;

async function main() {
  logger.info('Seeding file database');
  if ((await prisma.file.count()) === 0) {
    await prisma.file.create({
      data: {
        storageKey: 'seed/datasheet-msp430.pdf', provider: 'LOCAL', originalName: 'MSP430F5529-datasheet.pdf',
        fileName: 'datasheet-msp430.pdf', extension: 'pdf', mimeType: 'application/pdf', category: 'DATASHEET',
        sizeBytes: 245000, visibility: 'PRIVATE', uploadedBy: IDS.adminUser, processStatus: 'DONE'
      }
    });
  }
  logger.info('Seeded sample file(s)');
}
main().then(() => prisma.$disconnect()).catch((e) => { logger.error('Seed failed: %s', e); prisma.$disconnect(); process.exit(1); });
