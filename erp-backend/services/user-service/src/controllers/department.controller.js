'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const DepartmentService = require('../services/department.service');

class DepartmentController {
  static list = asyncHandler(async (req, res) => {
    const result = await DepartmentService.list(req.query);
    return ApiResponse.paginated(res, result, 'Departments fetched');
  });

  static options = asyncHandler(async (req, res) => {
    const options = await DepartmentService.options();
    return ApiResponse.ok(res, options, 'Department options fetched');
  });

  static get = asyncHandler(async (req, res) => {
    const department = await DepartmentService.getById(req.params.id);
    return ApiResponse.ok(res, department, 'Department fetched');
  });

  static create = asyncHandler(async (req, res) => {
    const department = await DepartmentService.create(req.body, req.user.id);
    return ApiResponse.created(res, department, 'Department created');
  });

  static update = asyncHandler(async (req, res) => {
    const department = await DepartmentService.update(req.params.id, req.body, req.user.id);
    return ApiResponse.ok(res, department, 'Department updated');
  });

  static remove = asyncHandler(async (req, res) => {
    const result = await DepartmentService.remove(req.params.id, req.user.id);
    return ApiResponse.ok(res, result, 'Department deleted');
  });
}

module.exports = DepartmentController;
