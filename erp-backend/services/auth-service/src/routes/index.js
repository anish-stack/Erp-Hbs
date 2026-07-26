'use strict';

const express = require('express');
const config = require('../config');
const authRoutes = require('./auth.routes');

const router = express.Router();

router.use(config.apiPrefix, authRoutes);

module.exports = router;
