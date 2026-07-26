'use strict';

const express = require('express');
const config = require('../config');
const gatewayIdentity = require('../middlewares/gatewayIdentity');
const auditRoutes = require('./audit.routes');

const router = express.Router();

router.use(gatewayIdentity);
router.use(`${config.basePath}/audit`, auditRoutes);

module.exports = router;
