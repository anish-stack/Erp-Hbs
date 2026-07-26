'use strict';

const express = require('express');
const config = require('../config');
const gatewayIdentity = require('../middlewares/gatewayIdentity');
const userRoutes = require('./user.routes');
const departmentRoutes = require('./department.routes');

const router = express.Router();

router.use(gatewayIdentity);

router.use(`${config.basePath}/users`, userRoutes);
router.use(`${config.basePath}/departments`, departmentRoutes);

module.exports = router;
