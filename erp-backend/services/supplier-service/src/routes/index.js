'use strict';

const express = require('express');
const config = require('../config');
const gatewayIdentity = require('../middlewares/gatewayIdentity');
const supplierRoutes = require('./supplier.routes');

const router = express.Router();

router.use(gatewayIdentity);
router.use(`${config.basePath}/suppliers`, supplierRoutes);

module.exports = router;
