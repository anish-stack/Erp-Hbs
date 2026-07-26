'use strict';
const express = require('express');
const config = require('../config');
const gatewayIdentity = require('../middlewares/gatewayIdentity');
const qualityRoutes = require('./quality.routes');
const router = express.Router();
router.use(gatewayIdentity);
router.use(`${config.basePath}/quality`, qualityRoutes);
module.exports = router;
