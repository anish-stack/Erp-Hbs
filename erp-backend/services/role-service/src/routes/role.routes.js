'use strict';

const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const RoleController = require('../controllers/role.controller');
const validators = require('../validators/role.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;

const router = express.Router();

router.get('/', authorize(P.role.VIEW), validate(validators.list, 'query'), RoleController.list);

router.post('/', authorize(P.role.CREATE), validate(validators.create), RoleController.create);

router.get(
  '/:id',
  authorize(P.role.VIEW),
  validate(validators.idParam, 'params'),
  RoleController.get
);

router.put(
  '/:id',
  authorize(P.role.UPDATE),
  validate(validators.idParam, 'params'),
  validate(validators.update),
  RoleController.update
);

router.delete(
  '/:id',
  authorize(P.role.DELETE),
  validate(validators.idParam, 'params'),
  RoleController.remove
);

router.post(
  '/:id/clone',
  authorize(P.role.CREATE),
  validate(validators.idParam, 'params'),
  validate(validators.clone),
  RoleController.clone
);

router.get(
  '/:id/permissions',
  authorize(P.role.VIEW),
  validate(validators.idParam, 'params'),
  RoleController.permissions
);

router.put(
  '/:id/permissions',
  authorize(P.permission.UPDATE),
  validate(validators.idParam, 'params'),
  validate(validators.permissionsReplace),
  RoleController.setPermissions
);

router.post(
  '/:id/permissions',
  authorize(P.permission.UPDATE),
  validate(validators.idParam, 'params'),
  validate(validators.permissionsMutate),
  RoleController.addPermissions
);

router.delete(
  '/:id/permissions',
  authorize(P.permission.UPDATE),
  validate(validators.idParam, 'params'),
  validate(validators.permissionsMutate),
  RoleController.removePermissions
);

module.exports = router;
