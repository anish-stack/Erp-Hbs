'use strict';

const express = require('express');
const config = require('../config');
const gatewayIdentity = require('../middlewares/gatewayIdentity');
const leadRoutes = require('./lead.routes');
const customerRoutes = require('./customer.routes');
const activityRoutes = require('./activity.routes');

const router = express.Router();
router.use(gatewayIdentity);

router.use(`${config.basePath}/leads`, leadRoutes);
router.use(`${config.basePath}/customers`, customerRoutes);
router.use(`${config.basePath}/activities`, activityRoutes);

module.exports = router;
