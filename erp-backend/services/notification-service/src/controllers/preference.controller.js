'use strict';
const { ApiResponse, asyncHandler } = require('@erp/shared');
const PreferenceService = require('../services/preference.service');

class PreferenceController {
  static get = asyncHandler(async (req, res) => ApiResponse.ok(res, await PreferenceService.get(req.user.id), 'Preferences fetched'));
  static update = asyncHandler(async (req, res) => ApiResponse.ok(res, await PreferenceService.update(req.user.id, req.body), 'Preferences updated'));
}
module.exports = PreferenceController;
