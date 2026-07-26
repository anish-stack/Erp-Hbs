'use strict';

const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const DepartmentController = require('../controllers/department.controller');
const validators = require('../validators/department.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;

const router = express.Router();

router.get('/options', DepartmentController.options);

router.get(
  '/',
  authorize(P.department.VIEW),
  validate(validators.list, 'query'),
  DepartmentController.list
);

router.post(
  '/',
  authorize(P.department.CREATE),
  validate(validators.create),
  DepartmentController.create
);

router.get(
  '/:id',
  authorize(P.department.VIEW),
  validate(validators.idParam, 'params'),
  DepartmentController.get
);

router.put(
  '/:id',
  authorize(P.department.UPDATE),
  validate(validators.idParam, 'params'),
  validate(validators.update),
  DepartmentController.update
);

router.delete(
  '/:id',
  authorize(P.department.DELETE),
  validate(validators.idParam, 'params'),
  DepartmentController.remove
);

module.exports = router;
