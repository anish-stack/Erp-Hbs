'use strict';
const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const PlanController = require('../controllers/plan.controller');
const InspectionController = require('../controllers/inspection.controller');
const v = require('../validators/quality.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;
const router = express.Router();

// Plans
router.get('/plans', authorize(P.quality.VIEW), validate(v.planList, 'query'), PlanController.list);
router.post('/plans', authorize(P.quality.CREATE), validate(v.planCreate), PlanController.create);
router.get('/plans/:id', authorize(P.quality.VIEW), validate(v.idParam, 'params'), PlanController.get);
router.put('/plans/:id', authorize(P.quality.UPDATE), validate(v.idParam, 'params'), validate(v.planUpdate), PlanController.update);
router.delete('/plans/:id', authorize(P.quality.DELETE), validate(v.idParam, 'params'), PlanController.remove);

// Stats
router.get('/stats', authorize(P.quality.VIEW), InspectionController.stats);

// Inspections
router.get('/inspections', authorize(P.quality.VIEW), validate(v.inspectionList, 'query'), InspectionController.list);
router.post('/inspections', authorize(P.quality.CREATE), validate(v.inspectionCreate), InspectionController.create);
router.get('/inspections/:id', authorize(P.quality.VIEW), validate(v.idParam, 'params'), InspectionController.get);
router.post('/inspections/:id/start', authorize(P.quality.UPDATE), validate(v.idParam, 'params'), InspectionController.start);
router.post('/inspections/:id/results', authorize(P.quality.UPDATE), validate(v.idParam, 'params'), validate(v.results), InspectionController.results);
router.post('/inspections/:id/complete', authorize(P.quality.APPROVE), validate(v.idParam, 'params'), validate(v.complete), InspectionController.complete);
router.post('/inspections/:id/hold', authorize(P.quality.UPDATE), validate(v.idParam, 'params'), validate(v.reason), InspectionController.hold);
router.post('/inspections/:id/cancel', authorize(P.quality.UPDATE), validate(v.idParam, 'params'), validate(v.reason), InspectionController.cancel);

module.exports = router;
