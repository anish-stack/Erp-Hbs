'use strict';

const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const UserController = require('../controllers/user.controller');
const validators = require('../validators/user.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;

const router = express.Router();

// -------------------- Self service --------------------
router.get('/me', UserController.me);
router.put('/me', validate(validators.updateProfile), UserController.updateMe);

// -------------------- Bulk --------------------
router.get('/stats', authorize(P.user.VIEW), UserController.stats);

router.post(
  '/export',
  authorize(P.user.EXPORT),
  validate(validators.exportRequest),
  UserController.requestExport
);

router.get('/import/template', authorize(P.user.IMPORT), UserController.importTemplate);

router.post(
  '/import',
  authorize(P.user.IMPORT),
  UserController.uploadImport,
  validate(validators.importRequest),
  UserController.requestImport
);

router.get(
  '/bulk',
  authorize(P.user.VIEW),
  validate(validators.bulkList, 'query'),
  UserController.bulkList
);

router.get(
  '/bulk/:bulkJobId',
  authorize(P.user.VIEW),
  validate(validators.bulkParam, 'params'),
  UserController.bulkStatus
);

router.get(
  '/bulk/:bulkJobId/download',
  authorize(P.user.EXPORT),
  validate(validators.bulkParam, 'params'),
  UserController.bulkDownload
);

// -------------------- CRUD --------------------
router.get('/', authorize(P.user.VIEW), validate(validators.list, 'query'), UserController.list);
router.post('/', authorize(P.user.CREATE), validate(validators.create), UserController.create);

router.get(
  '/:id',
  authorize(P.user.VIEW),
  validate(validators.idParam, 'params'),
  UserController.get
);

router.put(
  '/:id',
  authorize(P.user.UPDATE),
  validate(validators.idParam, 'params'),
  validate(validators.update),
  UserController.update
);

router.delete(
  '/:id',
  authorize(P.user.DELETE),
  validate(validators.idParam, 'params'),
  UserController.remove
);

router.get(
  '/:id/reports',
  authorize(P.user.VIEW),
  validate(validators.idParam, 'params'),
  UserController.directReports
);

router.patch(
  '/:id/status',
  authorize(P.user.UPDATE),
  validate(validators.idParam, 'params'),
  validate(validators.changeStatus),
  UserController.changeStatus
);

router.patch(
  '/:id/role',
  authorize(P.role.UPDATE),
  validate(validators.idParam, 'params'),
  validate(validators.changeRole),
  UserController.changeRole
);

router.post(
  '/:id/reset-password',
  authorize(P.user.UPDATE),
  validate(validators.idParam, 'params'),
  validate(validators.resetPassword),
  UserController.resetPassword
);

router.post(
  '/:id/unlock',
  authorize(P.user.UPDATE),
  validate(validators.idParam, 'params'),
  UserController.unlock
);

module.exports = router;
