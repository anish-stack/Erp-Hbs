'use strict';

const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const PermissionController = require('../controllers/permission.controller');
const validators = require('../validators/role.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;

const router = express.Router();

router.get(
  '/',
  authorize(P.permission.VIEW),
  validate(validators.permissionList, 'query'),
  PermissionController.list
);

router.get('/matrix', authorize(P.permission.VIEW), PermissionController.matrix);
router.get('/modules', authorize(P.permission.VIEW), PermissionController.modules);
router.post('/sync', authorize(P.permission.CREATE), PermissionController.sync);

module.exports = router;
