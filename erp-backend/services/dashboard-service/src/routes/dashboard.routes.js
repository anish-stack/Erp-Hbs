'use strict';
const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const DashboardController = require('../controllers/dashboard.controller');
const v = require('../validators/dashboard.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;
const router = express.Router();

router.get('/summary', authorize(P.dashboard.VIEW), validate(v.summaryQuery, 'query'), DashboardController.summary);
router.get('/widgets', authorize(P.dashboard.VIEW), DashboardController.available);
router.get('/widgets/:key', authorize(P.dashboard.VIEW), validate(v.keyParam, 'params'), DashboardController.widget);
router.get('/layout', authorize(P.dashboard.VIEW), DashboardController.getLayout);
router.put('/layout', authorize(P.dashboard.UPDATE), validate(v.layoutSave), DashboardController.saveLayout);

module.exports = router;
