'use strict';

const express = require('express');
const config = require('../config');
const gatewayIdentity = require('../middlewares/gatewayIdentity');
const inventoryRoutes = require('./inventory.routes');

const router = express.Router();

router.use(gatewayIdentity);
router.use(`${config.basePath}/inventory`, inventoryRoutes);

module.exports = router;
