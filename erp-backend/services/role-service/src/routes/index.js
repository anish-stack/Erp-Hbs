'use strict';

const express = require('express');
const config = require('../config');
const gatewayIdentity = require('../middlewares/gatewayIdentity');
const roleRoutes = require('./role.routes');
const permissionRoutes = require('./permission.routes');
const menuRoutes = require('./menu.routes');

const router = express.Router();

router.use(gatewayIdentity);

router.use(`${config.basePath}/roles`, roleRoutes);
router.use(`${config.basePath}/permissions`, permissionRoutes);
router.use(`${config.basePath}/menus`, menuRoutes);

module.exports = router;
