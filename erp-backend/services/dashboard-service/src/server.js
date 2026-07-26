'use strict';

const path = require('path');
const { env } = require('@erp/shared');

env.load(path.resolve(__dirname, '..'));

const { logger, cache } = require('@erp/shared');
const config = require('./config');
const createApp = require('./app');
const { connect: connectDb, disconnect: disconnectDb } = require('./config/prisma');

// Dashboard is a pure read-aggregator over other services' /stats endpoints,
// Redis-cached; it has no RabbitMQ consumers or BullMQ workers of its own.
env.requireAll(['DATABASE_URL', 'JWT_ACCESS_SECRET']);

let server;

async function bootstrap() {
  await connectDb();
  await cache.connect();

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
  logger.warn('Received %s, shutting down dashboard service', signal);

  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, config.shutdownTimeoutMs);

  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    await cache.disconnect();
    await disconnectDb();
    clearTimeout(forceExit);
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown: %s', err.message);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection: %s', reason));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception: %s', err.stack || err.message);
  process.exit(1);
});

bootstrap().catch((err) => {
  logger.error('Failed to bootstrap dashboard service: %s', err.message);
  process.exit(1);
});
