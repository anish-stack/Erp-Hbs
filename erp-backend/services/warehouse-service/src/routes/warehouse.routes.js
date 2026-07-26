'use strict';

const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const WarehouseController = require('../controllers/warehouse.controller');
const ZoneController = require('../controllers/zone.controller');
const BinController = require('../controllers/bin.controller');
const PutawayRuleController = require('../controllers/putawayRule.controller');
const TaskController = require('../controllers/task.controller');
const v = require('../validators/warehouse.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;

const router = express.Router();

// -------------------- Tasks (flat, before /:id) --------------------
router.get('/tasks', authorize(P.warehouse.VIEW), validate(v.taskList, 'query'), TaskController.list);
router.post('/tasks', authorize(P.warehouse.CREATE), validate(v.taskCreate), TaskController.create);
router.get('/tasks/:taskId', authorize(P.warehouse.VIEW), validate(v.taskParams, 'params'), TaskController.get);
router.post('/tasks/:taskId/assign', authorize(P.warehouse.UPDATE), validate(v.taskParams, 'params'), validate(v.taskAssign), TaskController.assign);
router.post('/tasks/:taskId/start', authorize(P.warehouse.UPDATE), validate(v.taskParams, 'params'), TaskController.start);
router.post('/tasks/:taskId/complete', authorize(P.warehouse.UPDATE), validate(v.taskParams, 'params'), validate(v.taskComplete), TaskController.complete);
router.post('/tasks/:taskId/cancel', authorize(P.warehouse.UPDATE), validate(v.taskParams, 'params'), validate(v.reason), TaskController.cancel);

// -------------------- Bins & zones by id (flat) --------------------
router.get('/bins/:binId', authorize(P.warehouse.VIEW), validate(v.binParams, 'params'), BinController.get);
router.put('/bins/:binId', authorize(P.warehouse.UPDATE), validate(v.binParams, 'params'), validate(v.binUpdate), BinController.update);
router.post('/bins/:binId/block', authorize(P.warehouse.UPDATE), validate(v.binParams, 'params'), validate(v.reasonOptional), BinController.block);
router.post('/bins/:binId/unblock', authorize(P.warehouse.UPDATE), validate(v.binParams, 'params'), validate(v.reasonOptional), BinController.unblock);
router.delete('/bins/:binId', authorize(P.warehouse.DELETE), validate(v.binParams, 'params'), BinController.remove);

router.put('/zones/:zoneId', authorize(P.warehouse.UPDATE), validate(v.zoneParams, 'params'), validate(v.zoneUpdate), ZoneController.update);
router.delete('/zones/:zoneId', authorize(P.warehouse.DELETE), validate(v.zoneParams, 'params'), ZoneController.remove);

router.put('/putaway-rules/:ruleId', authorize(P.warehouse.UPDATE), validate(v.ruleParams, 'params'), validate(v.ruleUpdate), PutawayRuleController.update);
router.delete('/putaway-rules/:ruleId', authorize(P.warehouse.DELETE), validate(v.ruleParams, 'params'), PutawayRuleController.remove);

// -------------------- Warehouse collection --------------------
router.get('/options', WarehouseController.options);
router.get('/stats', authorize(P.warehouse.VIEW), WarehouseController.stats);
router.get('/', authorize(P.warehouse.VIEW), validate(v.list, 'query'), WarehouseController.list);
router.post('/', authorize(P.warehouse.CREATE), validate(v.create), WarehouseController.create);

// -------------------- Single warehouse --------------------
router.get('/:id', authorize(P.warehouse.VIEW), validate(v.idParam, 'params'), WarehouseController.get);
router.put('/:id', authorize(P.warehouse.UPDATE), validate(v.idParam, 'params'), validate(v.update), WarehouseController.update);
router.delete('/:id', authorize(P.warehouse.DELETE), validate(v.idParam, 'params'), WarehouseController.remove);
router.post('/:id/activate', authorize(P.warehouse.UPDATE), validate(v.idParam, 'params'), WarehouseController.activate);
router.post('/:id/deactivate', authorize(P.warehouse.UPDATE), validate(v.idParam, 'params'), WarehouseController.deactivate);
router.post('/:id/set-default', authorize(P.warehouse.UPDATE), validate(v.idParam, 'params'), WarehouseController.setDefault);

// -------------------- Zones under a warehouse --------------------
router.get('/:id/zones', authorize(P.warehouse.VIEW), validate(v.idParam, 'params'), ZoneController.list);
router.post('/:id/zones', authorize(P.warehouse.CREATE), validate(v.idParam, 'params'), validate(v.zoneCreate), ZoneController.create);

// -------------------- Bins under a warehouse --------------------
router.get('/:id/bins', authorize(P.warehouse.VIEW), validate(v.idParam, 'params'), validate(v.binList, 'query'), BinController.list);
router.post('/:id/bins', authorize(P.warehouse.CREATE), validate(v.idParam, 'params'), validate(v.binCreate), BinController.create);
router.post('/:id/bins/bulk', authorize(P.warehouse.CREATE), validate(v.idParam, 'params'), validate(v.binBulk), BinController.bulkCreate);
router.get('/:id/bins/suggest', authorize(P.warehouse.VIEW), validate(v.idParam, 'params'), validate(v.binSuggest, 'query'), BinController.suggest);

// -------------------- Putaway rules under a warehouse --------------------
router.get('/:id/putaway-rules', authorize(P.warehouse.VIEW), validate(v.idParam, 'params'), PutawayRuleController.list);
router.post('/:id/putaway-rules', authorize(P.warehouse.CREATE), validate(v.idParam, 'params'), validate(v.ruleCreate), PutawayRuleController.create);
router.get('/:id/putaway/suggest', authorize(P.warehouse.VIEW), validate(v.idParam, 'params'), validate(v.putawaySuggest, 'query'), PutawayRuleController.suggest);

module.exports = router;
