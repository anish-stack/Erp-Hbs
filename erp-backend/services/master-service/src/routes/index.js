'use strict';

const express = require('express');
const config = require('../config');
const gatewayIdentity = require('../middlewares/gatewayIdentity');
const master = require('./master.routes');
const partRoutes = require('./part.routes');
const settingRoutes = require('./setting.routes');

const router = express.Router();
const base = `${config.basePath}/master`;

router.use(gatewayIdentity);

router.use(`${base}/manufacturers`, master.manufacturers);
router.use(`${base}/categories`, master.categories);
router.use(`${base}/uoms`, master.uoms);
router.use(`${base}/currencies`, master.currencies);
router.use(`${base}/tax-rates`, master.taxes);
router.use(`${base}/parts`, partRoutes);
router.use(`${base}/settings`, settingRoutes.settings);
router.use(`${base}/sequences`, settingRoutes.sequences);

module.exports = router;
