'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { middlewares, healthRouter, ApiResponse } = require('@erp/shared');
const config = require('./config');
const routes = require('./routes');
const { isHealthy } = require('./config/prisma');
const { getProvider, activeKind } = require('./services/providers');
const { buildDocument, swaggerUiOptions } = require('./swagger');

function createApp() {
  const app = express();

  middlewares.applySecurity(app);
  app.use(middlewares.requestContext);

  // Multipart bodies belong to multer, never to the JSON parsers.
  const skipBodyParse = (req) => req.is('multipart/form-data');
  app.use((req, res, next) =>
    skipBodyParse(req) ? next() : express.json({ limit: config.bodyLimit })(req, res, next)
  );
  app.use((req, res, next) =>
    skipBodyParse(req)
      ? next()
      : express.urlencoded({ extended: true, limit: config.bodyLimit })(req, res, next)
  );

  app.use(middlewares.xssSanitizer);
  app.use(middlewares.requestLogger);

  app.use(
    healthRouter({
      serviceName: config.serviceName,
      version: config.version,
      checks: {
        database: isHealthy,
        storage: async () => getProvider().healthy()
      }
    })
  );

  app.get('/', (req, res) =>
    ApiResponse.ok(
      res,
      {
        service: config.serviceName,
        version: config.version,
        storageProvider: activeKind(),
        docs: '/docs'
      },
      'ERP File Service'
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
