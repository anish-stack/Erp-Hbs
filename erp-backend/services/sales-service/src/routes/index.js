
'use strict';

const express = require('express');
const config = require('../config');
const salesRoutes = require('./sales.routes');

const router = express.Router();

router.use(`${config.basePath}/sales`, salesRoutes);

module.exports = router;