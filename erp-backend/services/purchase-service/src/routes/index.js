'use strict';
const express = require('express');
const config = require('../config');
const gatewayIdentity = require('../middlewares/gatewayIdentity');
const poRoutes = require('./po.routes');
const grnRoutes = require('./grn.routes');

const router = express.Router();
router.use(gatewayIdentity);
router.use(`${config.basePath}/purchase`, poRoutes);
router.use(`${config.basePath}/grn`, grnRoutes);

module.exports = router;
