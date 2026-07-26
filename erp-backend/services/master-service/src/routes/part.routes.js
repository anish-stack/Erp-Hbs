'use strict';

const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const PartController = require('../controllers/part.controller');
const v = require('../validators/part.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;

const router = express.Router();

router.get('/search', authorize(P.part.VIEW), validate(v.search, 'query'), PartController.search);
router.get('/stats', authorize(P.part.VIEW), PartController.stats);

router.get('/', authorize(P.part.VIEW), validate(v.list, 'query'), PartController.list);
router.post('/', authorize(P.part.CREATE), validate(v.create), PartController.create);

router.get('/:id', authorize(P.part.VIEW), validate(v.idParam, 'params'), PartController.get);
router.put('/:id', authorize(P.part.UPDATE), validate(v.idParam, 'params'), validate(v.update), PartController.update);
router.delete('/:id', authorize(P.part.DELETE), validate(v.idParam, 'params'), PartController.remove);

router.post(
  '/:id/alternates',
  authorize(P.part.UPDATE),
  validate(v.idParam, 'params'),
  validate(v.addAlternate),
  PartController.addAlternate
);

router.delete(
  '/:id/alternates/:alternateId',
  authorize(P.part.UPDATE),
  validate(v.alternateParams, 'params'),
  PartController.removeAlternate
);

module.exports = router;
