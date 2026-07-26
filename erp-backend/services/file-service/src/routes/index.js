'use strict';

const express = require('express');
const config = require('../config');
const fileRoutes = require('./file.routes');

const router = express.Router();

router.use(`${config.basePath}/files`, fileRoutes);

module.exports = router;
