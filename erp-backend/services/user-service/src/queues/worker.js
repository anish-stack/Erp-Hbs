'use strict';

const path = require('path');
const { env } = require('@erp/shared');

env.load(path.resolve(__dirname, '../..'));

const { logger, broker } = require('@erp/shared');
const { connect: connectDb, disconnect: disconnectDb } = require('../config/prisma');
const { startWorkers, scheduleRecurringJobs, closeAll } = require('./index');

async function bootstrap() {
  await connectDb();
  await broker.connect();
  startWorkers();
  await scheduleRecurringJobs();
  logger.info('User worker process ready');
}

async function shutdown(signal) {
  logger.warn('Worker received %s, shutting down', signal);
  await closeAll();
  await broker.close();
  await disconnectDb();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

bootstrap().catch((err) => {
  logger.error('Worker failed to start: %s', err.stack || err.message);
  process.exit(1);
});
