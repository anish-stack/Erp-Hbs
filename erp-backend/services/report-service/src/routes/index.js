'use strict';
const express = require('express');
const config = require('../config');
const gatewayIdentity = require('../middlewares/gatewayIdentity');
const reportRoutes = require('./report.routes');
const router = express.Router();
router.use(gatewayIdentity);
router.use(`${config.basePath}/reports`, reportRoutes);
module.exports = router;
