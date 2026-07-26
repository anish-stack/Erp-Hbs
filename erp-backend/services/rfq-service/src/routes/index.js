'use strict';

const express = require('express');
const config = require('../config');
const gatewayIdentity = require('../middlewares/gatewayIdentity');
const rfqRoutes = require('./rfq.routes');

const router = express.Router();
router.use(gatewayIdentity);
router.use(`${config.basePath}/rfq`, rfqRoutes);

module.exports = router;
