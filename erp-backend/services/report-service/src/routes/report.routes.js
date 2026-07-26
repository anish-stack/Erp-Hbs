'use strict';
const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const ReportController = require('../controllers/report.controller');
const v = require('../validators/report.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;
const router = express.Router();

router.get('/definitions', authorize(P.report.VIEW), ReportController.definitions);
router.get('/runs', authorize(P.report.VIEW), validate(v.list, 'query'), ReportController.list);
router.post('/runs', authorize(P.report.CREATE), validate(v.request), ReportController.request);
router.get('/runs/:id', authorize(P.report.VIEW), validate(v.idParam, 'params'), ReportController.get);

module.exports = router;
