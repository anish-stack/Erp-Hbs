'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const ActivityService = require('../services/activity.service');

class ActivityController {
  static create = asyncHandler(async (req, res) => {
    const activity = await ActivityService.create(req.body, req.user);
    return ApiResponse.created(res, activity, 'Activity logged');
  });

  static complete = asyncHandler(async (req, res) => {
    const activity = await ActivityService.complete(req.params.id, req.body.outcome, req.user);
    return ApiResponse.ok(res, activity, 'Activity marked complete');
  });
}

module.exports = ActivityController;
