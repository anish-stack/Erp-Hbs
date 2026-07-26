'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const RoleService = require('../services/role.service');

class RoleController {
  static list = asyncHandler(async (req, res) => {
    const result = await RoleService.list(req.query);
    return ApiResponse.paginated(res, result, 'Roles fetched');
  });

  static get = asyncHandler(async (req, res) => {
    const role = await RoleService.getById(req.params.id);
    return ApiResponse.ok(res, role, 'Role fetched');
  });

  static create = asyncHandler(async (req, res) => {
    const role = await RoleService.create(req.body, req.user.id);
    return ApiResponse.created(res, role, 'Role created');
  });

  static update = asyncHandler(async (req, res) => {
    const role = await RoleService.update(req.params.id, req.body, req.user.id);
    return ApiResponse.ok(res, role, 'Role updated');
  });

  static remove = asyncHandler(async (req, res) => {
    const result = await RoleService.remove(req.params.id, req.user.id);
    return ApiResponse.ok(res, result, 'Role deleted');
  });

  static clone = asyncHandler(async (req, res) => {
    const role = await RoleService.clone(req.params.id, req.body, req.user.id);
    return ApiResponse.created(res, role, 'Role cloned');
  });

  static permissions = asyncHandler(async (req, res) => {
    const permissions = await RoleService.permissions(req.params.id);
    return ApiResponse.ok(res, { roleId: req.params.id, permissions }, 'Role permissions fetched');
  });

  static setPermissions = asyncHandler(async (req, res) => {
    const result = await RoleService.setPermissions(req.params.id, req.body, req.user.id);
    return ApiResponse.ok(res, result, 'Role permissions updated');
  });

  static addPermissions = asyncHandler(async (req, res) => {
    const result = await RoleService.addPermissions(req.params.id, req.body, req.user.id);
    return ApiResponse.ok(res, result, 'Permissions granted');
  });

  static removePermissions = asyncHandler(async (req, res) => {
    const result = await RoleService.removePermissions(req.params.id, req.body, req.user.id);
    return ApiResponse.ok(res, result, 'Permissions revoked');
  });
}

module.exports = RoleController;
