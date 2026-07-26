'use strict';

const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const RfqController = require('../controllers/rfq.controller');
const v = require('../validators/rfq.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;

const router = express.Router();

router.get('/stats', authorize(P.rfq.VIEW), RfqController.stats);
router.get('/', authorize(P.rfq.VIEW), validate(v.list, 'query'), RfqController.list);
router.post('/', authorize(P.rfq.CREATE), validate(v.create), RfqController.create);

router.get('/:id', authorize(P.rfq.VIEW), validate(v.idParam, 'params'), RfqController.get);
router.put('/:id', authorize(P.rfq.UPDATE), validate(v.idParam, 'params'), validate(v.update), RfqController.update);
router.delete('/:id', authorize(P.rfq.DELETE), validate(v.idParam, 'params'), RfqController.remove);

router.post('/:id/suppliers', authorize(P.rfq.UPDATE), validate(v.idParam, 'params'), validate(v.addSuppliers), RfqController.addSuppliers);
router.delete('/:id/suppliers/:supplierId', authorize(P.rfq.UPDATE), validate(v.supplierParams, 'params'), RfqController.removeSupplier);

router.post('/:id/send', authorize(P.rfq.UPDATE), validate(v.idParam, 'params'), RfqController.send);
router.post('/:id/cancel', authorize(P.rfq.UPDATE), validate(v.idParam, 'params'), validate(v.cancel), RfqController.cancel);

router.post(
  '/:id/suppliers/:supplierId/quote',
  authorize(P.rfq.UPDATE),
  validate(v.supplierParams, 'params'),
  validate(v.submitQuote),
  RfqController.submitQuote
);
router.post(
  '/:id/suppliers/:supplierId/decline',
  authorize(P.rfq.UPDATE),
  validate(v.supplierParams, 'params'),
  validate(v.decline),
  RfqController.declineQuote
);

router.get('/:id/compare', authorize(P.rfq.VIEW), validate(v.idParam, 'params'), RfqController.compare);
router.post('/:id/compared', authorize(P.rfq.UPDATE), validate(v.idParam, 'params'), RfqController.markCompared);
router.post('/:id/award', authorize(P.rfq.APPROVE), validate(v.idParam, 'params'), validate(v.award), RfqController.award);
router.post('/:id/close', authorize(P.rfq.UPDATE), validate(v.idParam, 'params'), RfqController.close);

module.exports = router;
