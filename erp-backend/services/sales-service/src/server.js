'use strict';

const path = require('path');
const { env } = require('@erp/shared');

env.load(path.resolve(__dirname, '..'));

const { logger, cache, broker } = require('@erp/shared');
const config = require('./config');
const createApp = require('./app');
const { registerConsumers } = require('./events/consumers');
const { startWorkers, scheduleRecurringJobs, closeAll } = require('./queues');
const { connect: connectDb, disconnect: disconnectDb } = require('./config/prisma');

env.requireAll(['DATABASE_URL', 'JWT_ACCESS_SECRET', 'RABBITMQ_URL']);

let server;

async function bootstrap() {
  await connectDb();
  await cache.connect();
  await broker.connect();
  await registerConsumers();

  if (config.queue.runInline) {
    startWorkers();
    await scheduleRecurringJobs();
  }

  const app = createApp();

  server = app.listen(config.port, () => {
    logger.info(
      '%s listening on port %d [%s] base: %s',
      config.serviceName,
      config.port,
      config.nodeEnv,
      config.basePath
    );
  });

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 70000;
}

async function shutdown(signal) {
  logger.warn('Received %s, shutting down sales service', signal);

  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, config.shutdownTimeoutMs);

  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (config.queue.runInline) await closeAll();
    await broker.close();
    await cache.disconnect();
    await disconnectDb();
    clearTimeout(forceExit);
    logger.info('Sales service shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error('Shutdown error: %s', err.message);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection: %s', reason instanceof Error ? reason.stack : reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception: %s', err.stack || err.message);
  shutdown('uncaughtException');
});

bootstrap().catch((err) => {
  logger.error('Sales service failed to start: %s', err.stack || err.message);
  process.exit(1);
});
