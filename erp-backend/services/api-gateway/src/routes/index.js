'use strict';

const express = require('express');
const { logger } = require('@erp/shared');
const config = require('../config');
const { getRegistry } = require('../config/services');
const { createServiceProxy } = require('../middlewares/proxyFactory');
const gatewayRoutes = require('./gateway.routes');

const router = express.Router();

router.use('/gateway', gatewayRoutes);

for (const service of getRegistry()) {
  router.use(service.prefix, createServiceProxy(service));
  logger.info(
    'Mounted %s%s -> %s (%s)',
    config.apiPrefix,
    service.prefix,
    service.url,
    service.name
  );
}

module.exports = router;
