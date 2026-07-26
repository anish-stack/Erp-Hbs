'use strict';

const express = require('express');
const config = require('../config');
const gatewayIdentity = require('../middlewares/gatewayIdentity');
const warehouseRoutes = require('./warehouse.routes');

const router = express.Router();

router.use(gatewayIdentity);
router.use(`${config.basePath}/warehouse`, warehouseRoutes);

module.exports = router;
