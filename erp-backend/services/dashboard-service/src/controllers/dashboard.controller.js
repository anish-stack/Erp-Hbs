'use strict';
const { ApiResponse, asyncHandler } = require('@erp/shared');
const DashboardService = require('../services/dashboard.service');
const LayoutService = require('../services/layout.service');

class DashboardController {
  static summary = asyncHandler(async (req, res) => {
    const override = req.query.widgets ? req.query.widgets.split(',').map((s) => s.trim()).filter(Boolean) : null;
    return ApiResponse.ok(res, await DashboardService.summary(req.user, override), 'Dashboard summary fetched');
  });
  static widget = asyncHandler(async (req, res) => {
    const data = await DashboardService.widget(req.params.key, req.user);
    if (!data) return ApiResponse.ok(res, null, 'Unknown widget');
    return ApiResponse.ok(res, data, 'Widget fetched');
  });
  static available = asyncHandler(async (req, res) => ApiResponse.ok(res, { widgets: DashboardService.listAvailable(), roles: DashboardService.rolesMap() }, 'Widget catalog fetched'));
  static getLayout = asyncHandler(async (req, res) => ApiResponse.ok(res, await LayoutService.get(req.user.id, req.user.role), 'Layout fetched'));
  static saveLayout = asyncHandler(async (req, res) => ApiResponse.ok(res, await LayoutService.save(req.user.id, req.user.role, req.body.widgetKeys), 'Layout saved'));
}
module.exports = DashboardController;
