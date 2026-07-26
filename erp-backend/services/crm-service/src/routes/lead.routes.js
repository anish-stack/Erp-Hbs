'use strict';

const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const LeadController = require('../controllers/lead.controller');
const ActivityController = require('../controllers/activity.controller');
const v = require('../validators/lead.validator');
const av = require('../validators/customer.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;

const router = express.Router();

router.get('/pipeline', authorize(P.lead.VIEW), LeadController.pipeline);
router.get('/mine', authorize(P.lead.VIEW), LeadController.mine);

router.get('/', authorize(P.lead.VIEW), validate(v.list, 'query'), LeadController.list);
router.post('/', authorize(P.lead.CREATE), validate(v.create), LeadController.create);

router.get('/:id', authorize(P.lead.VIEW), validate(v.idParam, 'params'), LeadController.get);
router.put('/:id', authorize(P.lead.UPDATE), validate(v.idParam, 'params'), validate(v.update), LeadController.update);
router.delete('/:id', authorize(P.lead.DELETE), validate(v.idParam, 'params'), LeadController.remove);

router.patch('/:id/stage', authorize(P.lead.UPDATE), validate(v.idParam, 'params'), validate(v.changeStage), LeadController.changeStage);
router.post('/:id/followup', authorize(P.lead.UPDATE), validate(v.idParam, 'params'), validate(v.followUp), LeadController.followUp);
router.post('/:id/convert', authorize(P.customer.CREATE), validate(v.idParam, 'params'), validate(v.convert), LeadController.convert);

router.get('/:id/activities', authorize(P.lead.VIEW), validate(v.idParam, 'params'), validate(av.activityList, 'query'), LeadController.activities);

module.exports = router;
