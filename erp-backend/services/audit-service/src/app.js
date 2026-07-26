'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { middlewares, healthRouter, ApiResponse, broker } = require('@erp/shared');
const config = require('./config');
const routes = require('./routes');
const { isHealthy } = require('./config/prisma');
const { buildDocument, swaggerUiOptions } = require('./swagger');

function createApp() {
  const app = express();

  middlewares.applySecurity(app);
  app.use(middlewares.requestContext);
  app.use(express.json({ limit: config.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));
  app.use(middlewares.xssSanitizer);
  app.use(middlewares.requestLogger);

  app.use(
    healthRouter({
      serviceName: config.serviceName,
      version: config.version,
      checks: {
        database: isHealthy,
        eventBus: async () => broker.isConnected()
      }
    })
  );

  app.get('/', (req, res) =>
    ApiResponse.ok(
      res,
      { service: config.serviceName, version: config.version, docs: '/docs' },
      'ERP Audit Service'
    )
  );

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(buildDocument(), swaggerUiOptions));
  app.get('/docs.json', (req, res) => res.json(buildDocument()));

  app.use(routes);

  app.use(middlewares.notFound);
  app.use(middlewares.errorHandler);

  return app;
}

module.exports = createApp;
