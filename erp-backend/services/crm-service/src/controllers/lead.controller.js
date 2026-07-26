'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const LeadService = require('../services/lead.service');
const ConversionService = require('../services/conversion.service');
const ActivityService = require('../services/activity.service');

class LeadController {
  static list = asyncHandler(async (req, res) => {
    const result = await LeadService.list(req.query);
    return ApiResponse.paginated(res, result, 'Leads fetched');
  });

  static pipeline = asyncHandler(async (req, res) => {
    const result = await LeadService.pipeline();
    return ApiResponse.ok(res, result, 'Pipeline summary fetched');
  });

  static mine = asyncHandler(async (req, res) => {
    const leads = await LeadService.myLeads(req.user.id, req.query);
    return ApiResponse.ok(res, leads, 'Your leads fetched');
  });

  static get = asyncHandler(async (req, res) => {
    const lead = await LeadService.getById(req.params.id);
    return ApiResponse.ok(res, lead, 'Lead fetched');
  });

  static create = asyncHandler(async (req, res) => {
    const lead = await LeadService.create(req.body, req.user);
    return ApiResponse.created(res, lead, 'Lead created');
  });

  static update = asyncHandler(async (req, res) => {
    const lead = await LeadService.update(req.params.id, req.body, req.user);
    return ApiResponse.ok(res, lead, 'Lead updated');
  });

  static remove = asyncHandler(async (req, res) => {
    const result = await LeadService.remove(req.params.id, req.user);
    return ApiResponse.ok(res, result, 'Lead deleted');
  });

  static changeStage = asyncHandler(async (req, res) => {
    const lead = await LeadService.changeStage(req.params.id, req.body.stage, req.body, req.user);
    return ApiResponse.ok(res, lead, `Lead moved to ${lead.stage}`);
  });

  static followUp = asyncHandler(async (req, res) => {
    const lead = await LeadService.logFollowUp(req.params.id, req.body.notes, req.body.nextFollowUpAt, req.user);
    return ApiResponse.ok(res, lead, 'Follow-up logged');
  });

  static convert = asyncHandler(async (req, res) => {
    const result = await ConversionService.convert(req.params.id, req.body, req.user);
    return ApiResponse.created(res, result, `Lead converted to customer ${result.customer.code}`);
  });

  static activities = asyncHandler(async (req, res) => {
    const result = await ActivityService.listForLead(req.params.id, req.query);
    return ApiResponse.paginated(res, result, 'Activities fetched');
  });
}

module.exports = LeadController;
