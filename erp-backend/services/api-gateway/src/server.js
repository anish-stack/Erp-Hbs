'use strict';

const path = require('path');
const { env } = require('@erp/shared');

env.load(path.resolve(__dirname, '..'));

const { logger, cache } = require('@erp/shared');
const config = require('./config');
const createApp = require('./app');

env.requireAll(['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'AUTH_SERVICE_URL']);

let server;

async function bootstrap() {
  await cache.connect();

  const app = createApp();

  server = app.listen(config.port, () => {
    logger.info(
      '%s listening on port %d [%s] docs: %s/docs',
      config.serviceName,
      config.port,
      config.nodeEnv,
      config.publicUrl
    );
  });

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 70000;
}

async function shutdown(signal) {
  logger.warn('Received %s, shutting down gateway', signal);

  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, config.shutdownTimeoutMs);

  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    await cache.disconnect();
    clearTimeout(forceExit);
    logger.info('Gateway shutdown complete');
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
  logger.error('Gateway failed to start: %s', err.stack || err.message);
  process.exit(1);
});
