'use strict';
const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const GrnController = require('../controllers/grn.controller');
const v = require('../validators/grn.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;
const router = express.Router();

router.get('/:id', authorize(P.grn.VIEW), validate(v.grnIdParam, 'params'), GrnController.get);
router.post('/:id/inspection-result', authorize(P.quality.UPDATE), validate(v.grnIdParam, 'params'), validate(v.inspectionResult), GrnController.inspectionResult);

module.exports = router;
