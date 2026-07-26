'use strict';

const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const FileController = require('../controllers/file.controller');
const validators = require('../validators/file.validator');
const upload = require('../middlewares/upload');
const gatewayIdentity = require('../middlewares/gatewayIdentity');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;

const router = express.Router();

// -------------------- Public (token or signature is the credential) --------------------
router.get('/shared/:token', validate(validators.tokenParam, 'params'), FileController.openShared);
router.get('/raw/*', validate(validators.rawQuery, 'query'), FileController.rawLocal);
router.get('/static/*', FileController.staticLocal);

// -------------------- Authenticated --------------------
router.use(gatewayIdentity);

router.post('/upload', upload.single, validate(validators.upload), FileController.upload);
router.post('/upload/bulk', upload.multiple, validate(validators.upload), FileController.uploadMany);

router.get('/', validate(validators.list, 'query'), FileController.list);
router.get('/stats', authorize(P.file.VIEW), FileController.stats);
router.get('/providers', authorize(P.setting.VIEW), FileController.providers);

router.get(
  '/entity/:entity/:entityId',
  validate(validators.entityParams, 'params'),
  FileController.forEntity
);

router.get('/:id', validate(validators.idParam, 'params'), FileController.get);

router.get(
  '/:id/signed-url',
  validate(validators.idParam, 'params'),
  validate(validators.signedUrl, 'query'),
  FileController.signedUrl
);

router.get('/:id/download', validate(validators.idParam, 'params'), FileController.download);
router.get('/:id/preview', validate(validators.idParam, 'params'), FileController.preview);

router.patch(
  '/:id/attach',
  validate(validators.idParam, 'params'),
  validate(validators.attach),
  FileController.attach
);

router.put('/:id/replace', validate(validators.idParam, 'params'), upload.single, FileController.replace);

router.delete('/:id', validate(validators.idParam, 'params'), FileController.remove);

router.post(
  '/:id/shares',
  validate(validators.idParam, 'params'),
  validate(validators.share),
  FileController.createShare
);

router.get('/:id/shares', validate(validators.idParam, 'params'), FileController.listShares);

router.delete(
  '/:id/shares/:shareId',
  validate(validators.shareParams, 'params'),
  FileController.revokeShare
);

module.exports = router;
