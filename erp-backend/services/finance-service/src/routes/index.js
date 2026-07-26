'use strict';
const express = require('express');
const config = require('../config');
const gatewayIdentity = require('../middlewares/gatewayIdentity');
const financeRoutes = require('./finance.routes');
const router = express.Router();
router.use(gatewayIdentity);
router.use(`${config.basePath}/finance`, financeRoutes);
module.exports = router;
