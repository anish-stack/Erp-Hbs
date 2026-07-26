'use strict';

const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const ActivityController = require('../controllers/activity.controller');
const v = require('../validators/customer.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;

const router = express.Router();

router.post('/', authorize(P.lead.UPDATE), validate(v.activity), ActivityController.create);
router.post('/:id/complete', authorize(P.lead.UPDATE), validate(v.activityComplete), ActivityController.complete);

module.exports = router;
