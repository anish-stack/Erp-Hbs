'use strict';
const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const PoController = require('../controllers/po.controller');
const GrnController = require('../controllers/grn.controller');
const v = require('../validators/po.validator');
const gv = require('../validators/grn.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;
const router = express.Router();

router.get('/stats', authorize(P.purchase.VIEW), PoController.stats);
router.get('/', authorize(P.purchase.VIEW), validate(v.list, 'query'), PoController.list);
router.post('/', authorize(P.purchase.CREATE), validate(v.create), PoController.create);

router.get('/:id', authorize(P.purchase.VIEW), validate(v.idParam, 'params'), PoController.get);
router.put('/:id', authorize(P.purchase.UPDATE), validate(v.idParam, 'params'), validate(v.update), PoController.update);
router.delete('/:id', authorize(P.purchase.DELETE), validate(v.idParam, 'params'), PoController.remove);

router.post('/:id/submit', authorize(P.purchase.UPDATE), validate(v.idParam, 'params'), PoController.submit);
router.post('/:id/approve', authorize(P.purchase.APPROVE), validate(v.idParam, 'params'), PoController.approve);
router.post('/:id/reject', authorize(P.purchase.APPROVE), validate(v.idParam, 'params'), validate(v.reason), PoController.reject);
router.post('/:id/issue', authorize(P.purchase.UPDATE), validate(v.idParam, 'params'), PoController.issue);
router.post('/:id/cancel', authorize(P.purchase.UPDATE), validate(v.idParam, 'params'), validate(v.reason), PoController.cancel);
router.post('/:id/close', authorize(P.purchase.UPDATE), validate(v.idParam, 'params'), PoController.close);

router.get('/:poId/grns', authorize(P.grn.VIEW), validate(gv.poIdParam, 'params'), GrnController.forPo);
router.post('/:poId/grns', authorize(P.grn.CREATE), validate(gv.poIdParam, 'params'), validate(gv.create), GrnController.create);

module.exports = router;
