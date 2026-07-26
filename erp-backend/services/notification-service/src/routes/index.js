'use strict';
const express = require('express');
const config = require('../config');
const gatewayIdentity = require('../middlewares/gatewayIdentity');
const notificationRoutes = require('./notification.routes');
const router = express.Router();
router.use(gatewayIdentity);
router.use(`${config.basePath}/notifications`, notificationRoutes);
module.exports = router;
