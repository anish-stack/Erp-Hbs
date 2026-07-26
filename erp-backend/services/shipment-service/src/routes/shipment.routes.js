'use strict';
const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const ShipmentController = require('../controllers/shipment.controller');
const v = require('../validators/shipment.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;
const router = express.Router();

router.get('/stats', authorize(P.shipment.VIEW), ShipmentController.stats);
router.get('/', authorize(P.shipment.VIEW), validate(v.list, 'query'), ShipmentController.list);
router.post('/', authorize(P.shipment.CREATE), validate(v.create), ShipmentController.create);
router.post('/from-order', authorize(P.shipment.CREATE), validate(v.fromOrder), ShipmentController.fromOrder);
router.get('/:id', authorize(P.shipment.VIEW), validate(v.idParam, 'params'), ShipmentController.get);
router.post('/:id/pick-tasks', authorize(P.shipment.UPDATE), validate(v.idParam, 'params'), ShipmentController.createPickTasks);
router.post('/:id/pick', authorize(P.shipment.UPDATE), validate(v.idParam, 'params'), validate(v.pick), ShipmentController.pick);
router.post('/:id/pack', authorize(P.shipment.UPDATE), validate(v.idParam, 'params'), validate(v.pack), ShipmentController.pack);
router.post('/:id/dispatch', authorize(P.shipment.APPROVE), validate(v.idParam, 'params'), validate(v.dispatch), ShipmentController.dispatch);
router.post('/:id/deliver', authorize(P.shipment.UPDATE), validate(v.idParam, 'params'), ShipmentController.deliver);
router.post('/:id/cancel', authorize(P.shipment.UPDATE), validate(v.idParam, 'params'), validate(v.reason), ShipmentController.cancel);

module.exports = router;
