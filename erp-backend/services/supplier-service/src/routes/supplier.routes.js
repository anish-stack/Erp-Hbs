'use strict';

const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const SupplierController = require('../controllers/supplier.controller');
const PriceController = require('../controllers/price.controller');
const v = require('../validators/supplier.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;

const router = express.Router();

// -------------------- Collection --------------------
router.get('/options', SupplierController.options);
router.get('/stats', authorize(P.supplier.VIEW), SupplierController.stats);
router.get('/leaderboard', authorize(P.supplier.VIEW), SupplierController.leaderboard);
router.get('/prices', authorize(P.supplier.VIEW), validate(v.priceList, 'query'), PriceController.list);
router.get('/prices/compare', authorize(P.supplier.VIEW), validate(v.compare, 'query'), PriceController.compare);

router.get('/', authorize(P.supplier.VIEW), validate(v.list, 'query'), SupplierController.list);
router.post('/', authorize(P.supplier.CREATE), validate(v.create), SupplierController.create);

// -------------------- Single supplier --------------------
router.get('/:id', authorize(P.supplier.VIEW), validate(v.idParam, 'params'), SupplierController.get);
router.put('/:id', authorize(P.supplier.UPDATE), validate(v.idParam, 'params'), validate(v.update), SupplierController.update);
router.delete('/:id', authorize(P.supplier.DELETE), validate(v.idParam, 'params'), SupplierController.remove);

// -------------------- Approval workflow --------------------
router.get('/:id/readiness', authorize(P.supplier.VIEW), validate(v.idParam, 'params'), SupplierController.readiness);
router.post('/:id/submit', authorize(P.supplier.UPDATE), validate(v.idParam, 'params'), SupplierController.submit);
router.post('/:id/approve', authorize(P.supplier.APPROVE), validate(v.idParam, 'params'), SupplierController.approve);
router.post('/:id/reject', authorize(P.supplier.APPROVE), validate(v.idParam, 'params'), validate(v.reason), SupplierController.reject);
router.post('/:id/hold', authorize(P.supplier.APPROVE), validate(v.idParam, 'params'), validate(v.reason), SupplierController.hold);
router.post('/:id/blacklist', authorize(P.supplier.APPROVE), validate(v.idParam, 'params'), validate(v.reason), SupplierController.blacklist);
router.post('/:id/reinstate', authorize(P.supplier.APPROVE), validate(v.idParam, 'params'), SupplierController.reinstate);

// -------------------- Addresses / contacts / banks --------------------
router.post('/:id/addresses', authorize(P.supplier.UPDATE), validate(v.idParam, 'params'), validate(v.address), SupplierController.addAddress);
router.put('/:id/addresses/:childId', authorize(P.supplier.UPDATE), validate(v.childParams, 'params'), validate(v.address), SupplierController.updateAddress);
router.delete('/:id/addresses/:childId', authorize(P.supplier.UPDATE), validate(v.childParams, 'params'), SupplierController.removeAddress);

router.post('/:id/contacts', authorize(P.supplier.UPDATE), validate(v.idParam, 'params'), validate(v.contact), SupplierController.addContact);
router.put('/:id/contacts/:childId', authorize(P.supplier.UPDATE), validate(v.childParams, 'params'), validate(v.contact), SupplierController.updateContact);
router.delete('/:id/contacts/:childId', authorize(P.supplier.UPDATE), validate(v.childParams, 'params'), SupplierController.removeContact);

router.post('/:id/bank-accounts', authorize(P.supplier.UPDATE), validate(v.idParam, 'params'), validate(v.bankAccount), SupplierController.addBankAccount);
router.post('/:id/bank-accounts/:childId/verify', authorize(P.finance.APPROVE), validate(v.childParams, 'params'), SupplierController.verifyBankAccount);
router.delete('/:id/bank-accounts/:childId', authorize(P.supplier.UPDATE), validate(v.childParams, 'params'), SupplierController.removeBankAccount);

// -------------------- Documents --------------------
router.post('/:id/documents', authorize(P.supplier.UPDATE), validate(v.idParam, 'params'), validate(v.document), SupplierController.addDocument);
router.post('/:id/documents/:childId/verify', authorize(P.supplier.APPROVE), validate(v.childParams, 'params'), SupplierController.verifyDocument);
router.delete('/:id/documents/:childId', authorize(P.supplier.UPDATE), validate(v.childParams, 'params'), SupplierController.removeDocument);

// -------------------- Price list --------------------
router.get('/:id/parts', authorize(P.supplier.VIEW), validate(v.idParam, 'params'), PriceController.partsOfSupplier);
router.post('/:id/prices', authorize(P.supplier.UPDATE), validate(v.idParam, 'params'), validate(v.price), PriceController.create);
router.put('/:id/prices/bulk', authorize(P.supplier.UPDATE), validate(v.idParam, 'params'), validate(v.priceBulk), PriceController.bulkReplace);
router.put('/:id/prices/:priceId', authorize(P.supplier.UPDATE), validate(v.priceUpdate), PriceController.update);
router.delete('/:id/prices/:priceId', authorize(P.supplier.UPDATE), PriceController.remove);

// -------------------- Ratings --------------------
router.get('/:id/ratings', authorize(P.supplier.VIEW), validate(v.idParam, 'params'), SupplierController.ratingHistory);
router.post('/:id/ratings', authorize(P.supplier.APPROVE), validate(v.idParam, 'params'), validate(v.evaluate), SupplierController.evaluate);

module.exports = router;
