'use strict';

const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const AuditController = require('../controllers/audit.controller');
const validators = require('../validators/audit.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;

const router = express.Router();

// Any authenticated user can read their own trail.
router.get('/me', validate(validators.list, 'query'), AuditController.myActivity);

router.get('/', authorize(P.audit.VIEW), validate(validators.list, 'query'), AuditController.list);

router.get('/stats', authorize(P.audit.VIEW), validate(validators.stats, 'query'), AuditController.stats);

router.get(
  '/summaries',
  authorize(P.audit.VIEW),
  validate(validators.summaries, 'query'),
  AuditController.summaries
);

router.post('/', authorize(P.audit.CREATE), validate(validators.ingest), AuditController.ingest);

router.post(
  '/exports',
  authorize(P.audit.EXPORT),
  validate(validators.exportRequest),
  AuditController.requestExport
);

router.get(
  '/exports/:exportJobId',
  authorize(P.audit.VIEW),
  validate(validators.exportParam, 'params'),
  AuditController.exportStatus
);

router.get(
  '/exports/:exportJobId/download',
  authorize(P.audit.EXPORT),
  validate(validators.exportParam, 'params'),
  AuditController.exportDownload
);

router.get(
  '/dead-letters',
  authorize(P.audit.UPDATE),
  validate(validators.deadLetters, 'query'),
  AuditController.deadLetters
);

router.post(
  '/dead-letters/:id/resolve',
  authorize(P.audit.UPDATE),
  validate(validators.idParam, 'params'),
  AuditController.resolveDeadLetter
);

router.get(
  '/trace/:correlationId',
  authorize(P.audit.VIEW),
  validate(validators.traceParam, 'params'),
  AuditController.trace
);

router.get(
  '/user/:userId',
  validate(validators.userParam, 'params'),
  validate(validators.list, 'query'),
  AuditController.userActivity
);

router.get(
  '/entity/:entity/:entityId',
  authorize(P.audit.VIEW),
  validate(validators.timelineParams, 'params'),
  validate(validators.pagination, 'query'),
  AuditController.timeline
);

router.get(
  '/:id',
  authorize(P.audit.VIEW),
  validate(validators.idParam, 'params'),
  AuditController.get
);

module.exports = router;
