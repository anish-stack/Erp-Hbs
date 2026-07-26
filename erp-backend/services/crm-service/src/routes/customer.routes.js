'use strict';

const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const CustomerController = require('../controllers/customer.controller');
const v = require('../validators/customer.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;

const router = express.Router();

router.get('/options', CustomerController.options);
router.get('/stats', authorize(P.customer.VIEW), CustomerController.stats);

router.get('/', authorize(P.customer.VIEW), validate(v.list, 'query'), CustomerController.list);
router.post('/', authorize(P.customer.CREATE), validate(v.create), CustomerController.create);

router.get('/:id', authorize(P.customer.VIEW), validate(v.idParam, 'params'), CustomerController.get);
router.put('/:id', authorize(P.customer.UPDATE), validate(v.idParam, 'params'), validate(v.update), CustomerController.update);
router.delete('/:id', authorize(P.customer.DELETE), validate(v.idParam, 'params'), CustomerController.remove);

router.patch('/:id/status', authorize(P.customer.APPROVE), validate(v.idParam, 'params'), validate(v.setStatus), CustomerController.setStatus);

router.post('/:id/credit/adjust', authorize(P.finance.UPDATE), validate(v.idParam, 'params'), validate(v.creditAdjust), CustomerController.adjustCredit);
router.get('/:id/credit/check', authorize(P.customer.VIEW), validate(v.idParam, 'params'), validate(v.creditCheck, 'query'), CustomerController.checkCredit);

router.post('/:id/addresses', authorize(P.customer.UPDATE), validate(v.idParam, 'params'), validate(v.address), CustomerController.addAddress);
router.put('/:id/addresses/:childId', authorize(P.customer.UPDATE), validate(v.childParams, 'params'), validate(v.address), CustomerController.updateAddress);
router.delete('/:id/addresses/:childId', authorize(P.customer.UPDATE), validate(v.childParams, 'params'), CustomerController.removeAddress);

router.post('/:id/contacts', authorize(P.customer.UPDATE), validate(v.idParam, 'params'), validate(v.contact), CustomerController.addContact);
router.put('/:id/contacts/:childId', authorize(P.customer.UPDATE), validate(v.childParams, 'params'), validate(v.contact), CustomerController.updateContact);
router.delete('/:id/contacts/:childId', authorize(P.customer.UPDATE), validate(v.childParams, 'params'), CustomerController.removeContact);

router.get('/:id/activities', authorize(P.customer.VIEW), validate(v.idParam, 'params'), validate(v.activityList, 'query'), CustomerController.activities);

module.exports = router;
