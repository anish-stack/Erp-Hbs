'use strict';

const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const StockController = require('../controllers/stock.controller');
const MovementController = require('../controllers/movement.controller');
const ReservationController = require('../controllers/reservation.controller');
const AdjustmentController = require('../controllers/adjustment.controller');
const v = require('../validators/inventory.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;

const router = express.Router();

// -------------------- Stock positions --------------------
router.get('/stats', authorize(P.inventory.VIEW), StockController.stats);
router.get('/low-stock', authorize(P.inventory.VIEW), StockController.lowStock);
router.get('/availability', authorize(P.inventory.VIEW), validate(v.availability, 'query'), StockController.availability);

router.get('/stock', authorize(P.inventory.VIEW), validate(v.stockList, 'query'), StockController.list);
router.get('/stock/by-part/:partId', authorize(P.inventory.VIEW), validate(v.partParam, 'params'), StockController.byPart);
router.get('/stock/:id', authorize(P.inventory.VIEW), validate(v.idParam, 'params'), StockController.get);
router.put('/stock/:id/reorder', authorize(P.inventory.UPDATE), validate(v.idParam, 'params'), validate(v.reorder), StockController.setReorder);

// -------------------- Ledger operations --------------------
router.post('/receipts', authorize(P.inventory.CREATE), validate(v.receipt), StockController.receipt);
router.post('/issues', authorize(P.inventory.CREATE), validate(v.issue), StockController.issue);
router.post('/transfers', authorize(P.inventory.CREATE), validate(v.transfer), StockController.transfer);

// -------------------- Movements & lots --------------------
router.get('/movements', authorize(P.inventory.VIEW), validate(v.movementList, 'query'), MovementController.listMovements);
router.get('/lots', authorize(P.inventory.VIEW), validate(v.lotList, 'query'), MovementController.listLots);
router.get('/lots/:id', authorize(P.inventory.VIEW), validate(v.idParam, 'params'), MovementController.getLot);

// -------------------- Reservations --------------------
router.get('/reservations', authorize(P.inventory.VIEW), validate(v.reservationList, 'query'), ReservationController.list);
router.post('/reservations', authorize(P.inventory.CREATE), validate(v.reserve), ReservationController.reserve);
router.post('/reservations/:id/release', authorize(P.inventory.UPDATE), validate(v.idParam, 'params'), ReservationController.release);
router.post('/reservations/:id/fulfill', authorize(P.inventory.UPDATE), validate(v.idParam, 'params'), validate(v.fulfill), ReservationController.fulfill);

// -------------------- Adjustments (approval-gated) --------------------
router.get('/adjustments', authorize(P.inventory.VIEW), validate(v.adjustmentList, 'query'), AdjustmentController.list);
router.post('/adjustments', authorize(P.inventory.CREATE), validate(v.adjustmentCreate), AdjustmentController.create);
router.get('/adjustments/:id', authorize(P.inventory.VIEW), validate(v.idParam, 'params'), AdjustmentController.get);
router.put('/adjustments/:id', authorize(P.inventory.UPDATE), validate(v.idParam, 'params'), validate(v.adjustmentUpdate), AdjustmentController.update);
router.post('/adjustments/:id/submit', authorize(P.inventory.UPDATE), validate(v.idParam, 'params'), AdjustmentController.submit);
router.post('/adjustments/:id/approve', authorize(P.inventory.APPROVE), validate(v.idParam, 'params'), AdjustmentController.approve);
router.post('/adjustments/:id/reject', authorize(P.inventory.APPROVE), validate(v.idParam, 'params'), validate(v.reason), AdjustmentController.reject);
router.post('/adjustments/:id/post', authorize(P.inventory.APPROVE), validate(v.idParam, 'params'), AdjustmentController.post);

module.exports = router;
