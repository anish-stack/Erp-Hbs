'use strict';

const { PrismaClient } = require('../generated/prisma');
const { logger, env } = require('@erp/shared');

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' }
  ],
  errorFormat: 'minimal'
});

prisma.$on('error', (event) => logger.error('Prisma error: %s', event.message));
prisma.$on('warn', (event) => logger.warn('Prisma warning: %s', event.message));

async function connect() {
  await prisma.$connect();
  logger.info('MySQL connected via Prisma');
  return prisma;
}

async function disconnect() {
  await prisma.$disconnect();
  logger.info('MySQL disconnected');
}

async function isHealthy() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = { prisma, connect, disconnect, isHealthy };
