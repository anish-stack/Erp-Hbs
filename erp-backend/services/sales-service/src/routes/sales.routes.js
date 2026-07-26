'use strict';
const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const QuotationController = require('../controllers/quotation.controller');
const OrderController = require('../controllers/order.controller');
const v = require('../validators/sales.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;
const router = express.Router();

// Stats
router.get('/stats', authorize(P.sales.VIEW), OrderController.stats);

// Quotations
router.get('/quotations', authorize(P.sales.VIEW), validate(v.quotationList, 'query'), QuotationController.list);
router.post('/quotations', authorize(P.sales.CREATE), validate(v.quotationCreate), QuotationController.create);
router.get('/quotations/:id', authorize(P.sales.VIEW), validate(v.idParam, 'params'), QuotationController.get);
router.put('/quotations/:id', authorize(P.sales.UPDATE), validate(v.idParam, 'params'), validate(v.quotationUpdate), QuotationController.update);
router.post('/quotations/:id/send', authorize(P.sales.UPDATE), validate(v.idParam, 'params'), QuotationController.send);
router.post('/quotations/:id/accept', authorize(P.sales.UPDATE), validate(v.idParam, 'params'), QuotationController.accept);
router.post('/quotations/:id/reject', authorize(P.sales.UPDATE), validate(v.idParam, 'params'), QuotationController.reject);
router.post('/quotations/:id/convert', authorize(P.sales.CREATE), validate(v.idParam, 'params'), validate(v.convert), QuotationController.convert);

// Orders
router.get('/orders', authorize(P.sales.VIEW), validate(v.orderList, 'query'), OrderController.list);
router.post('/orders', authorize(P.sales.CREATE), validate(v.orderCreate), OrderController.create);
router.get('/orders/:id', authorize(P.sales.VIEW), validate(v.idParam, 'params'), OrderController.get);
router.put('/orders/:id', authorize(P.sales.UPDATE), validate(v.idParam, 'params'), validate(v.orderUpdate), OrderController.update);
router.post('/orders/:id/confirm', authorize(P.sales.APPROVE), validate(v.idParam, 'params'), OrderController.confirm);
router.post('/orders/:id/cancel', authorize(P.sales.UPDATE), validate(v.idParam, 'params'), validate(v.reason), OrderController.cancel);
router.post('/orders/:id/close', authorize(P.sales.UPDATE), validate(v.idParam, 'params'), OrderController.close);

module.exports = router;
