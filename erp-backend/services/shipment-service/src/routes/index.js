'use strict';
const express = require('express');
const config = require('../config');
const gatewayIdentity = require('../middlewares/gatewayIdentity');
const shipmentRoutes = require('./shipment.routes');
const router = express.Router();
router.use(gatewayIdentity);
router.use(`${config.basePath}/shipment`, shipmentRoutes);
module.exports = router;
