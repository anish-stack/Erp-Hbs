'use strict';
const express = require('express');
const config = require('../config');
const gatewayIdentity = require('../middlewares/gatewayIdentity');
const dashboardRoutes = require('./dashboard.routes');
const router = express.Router();
router.use(gatewayIdentity);
router.use(`${config.basePath}/dashboard`, dashboardRoutes);
module.exports = router;
