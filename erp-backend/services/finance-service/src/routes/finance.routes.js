'use strict';
const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const InvoiceController = require('../controllers/invoice.controller');
const PaymentController = require('../controllers/payment.controller');
const v = require('../validators/finance.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;
const router = express.Router();

// Stats
router.get('/stats', authorize(P.finance.VIEW), InvoiceController.stats);
router.get('/payments/stats', authorize(P.finance.VIEW), PaymentController.stats);

// Invoices
router.get('/invoices', authorize(P.finance.VIEW), validate(v.invoiceList, 'query'), InvoiceController.list);
router.post('/invoices', authorize(P.finance.CREATE), validate(v.invoiceCreate), InvoiceController.create);
router.post('/invoices/from-sales-order', authorize(P.finance.CREATE), validate(v.fromSalesOrder), InvoiceController.fromSalesOrder);
router.post('/invoices/from-purchase-order', authorize(P.finance.CREATE), validate(v.fromPurchaseOrder), InvoiceController.fromPurchaseOrder);
router.get('/invoices/:id', authorize(P.finance.VIEW), validate(v.idParam, 'params'), InvoiceController.get);
router.post('/invoices/:id/issue', authorize(P.finance.APPROVE), validate(v.idParam, 'params'), InvoiceController.issue);
router.post('/invoices/:id/cancel', authorize(P.finance.UPDATE), validate(v.idParam, 'params'), validate(v.reason), InvoiceController.cancel);

// Payments
router.get('/payments', authorize(P.finance.VIEW), validate(v.paymentList, 'query'), PaymentController.list);
router.post('/payments', authorize(P.finance.CREATE), validate(v.paymentCreate), PaymentController.create);
router.get('/payments/:id', authorize(P.finance.VIEW), validate(v.idParam, 'params'), PaymentController.get);

module.exports = router;
