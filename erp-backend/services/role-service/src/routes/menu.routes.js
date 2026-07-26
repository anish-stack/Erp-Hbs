'use strict';

const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const MenuController = require('../controllers/menu.controller');
const validators = require('../validators/menu.validator');
const roleValidators = require('../validators/role.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;

const router = express.Router();

// Every authenticated user may read their own navigation.
router.get('/me', MenuController.myNavigation);

router.get('/', authorize(P.role.VIEW), validate(validators.list, 'query'), MenuController.list);

router.post('/', authorize(P.setting.CREATE), validate(validators.create), MenuController.create);

router.put('/reorder', authorize(P.setting.UPDATE), validate(validators.reorder), MenuController.reorder);

router.get(
  '/role/:roleId',
  authorize(P.role.VIEW),
  validate(validators.roleParam, 'params'),
  MenuController.roleNavigation
);

router.get(
  '/role/:roleId/assignments',
  authorize(P.role.VIEW),
  validate(validators.roleParam, 'params'),
  MenuController.roleMenus
);

router.put(
  '/role/:roleId/assignments',
  authorize(P.role.UPDATE),
  validate(validators.roleParam, 'params'),
  validate(validators.assignRoleMenus),
  MenuController.setRoleMenus
);

router.get(
  '/:id',
  authorize(P.role.VIEW),
  validate(validators.idParam, 'params'),
  MenuController.get
);

router.put(
  '/:id',
  authorize(P.setting.UPDATE),
  validate(validators.idParam, 'params'),
  validate(validators.update),
  MenuController.update
);

router.delete(
  '/:id',
  authorize(P.setting.DELETE),
  validate(roleValidators.idParam, 'params'),
  MenuController.remove
);

module.exports = router;
