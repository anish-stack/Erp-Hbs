'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { middlewares, healthRouter, cache, ApiResponse } = require('@erp/shared');
const config = require('./config');
const routes = require('./routes');
const gatewayAuth = require('./middlewares/gatewayAuth');
const { buildGatewayDocument, swaggerUiOptions } = require('./swagger');

function createApp() {
  const app = express();

  middlewares.applySecurity(app);
  app.use(middlewares.requestContext);

  // Multipart uploads must stream straight through to the File Service.
  const skipBodyParse = (req) =>
    req.is('multipart/form-data') || req.originalUrl.startsWith(`${config.apiPrefix}/files`);

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

  app.use(healthRouter({ serviceName: config.serviceName, version: config.version, rabbitmq: false }));

  app.get('/', (req, res) =>
    ApiResponse.ok(
      res,
      {
        service: config.serviceName,
        version: config.version,
        environment: config.nodeEnv,
        apiPrefix: config.apiPrefix,
        docs: '/docs'
      },
      'ERP API Gateway'
    )
  );

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(buildGatewayDocument(), swaggerUiOptions));
  app.get('/docs.json', (req, res) => res.json(buildGatewayDocument()));

  app.use(config.apiPrefix, middlewares.globalLimiter());
  app.use(`${config.apiPrefix}/auth`, middlewares.authLimiter());
  app.use(config.apiPrefix, gatewayAuth);
  app.use(config.apiPrefix, routes);

  app.use(middlewares.notFound);
  app.use(middlewares.errorHandler);

  app.locals.cache = cache;
  return app;
}

module.exports = createApp;
