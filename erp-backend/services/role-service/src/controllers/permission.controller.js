'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const PermissionService = require('../services/permission.service');

class PermissionController {
  static list = asyncHandler(async (req, res) => {
    const result = await PermissionService.list(req.query);
    return ApiResponse.paginated(res, result, 'Permissions fetched');
  });

  static matrix = asyncHandler(async (req, res) => {
    const matrix = await PermissionService.matrix();
    return ApiResponse.ok(res, matrix, 'Permission matrix fetched');
  });

  static modules = asyncHandler(async (req, res) => {
    const modules = await PermissionService.modules();
    return ApiResponse.ok(res, { modules }, 'Modules fetched');
  });

  static sync = asyncHandler(async (req, res) => {
    const result = await PermissionService.sync();
    return ApiResponse.ok(res, result, 'Permission catalogue synchronised');
  });
}

module.exports = PermissionController;
