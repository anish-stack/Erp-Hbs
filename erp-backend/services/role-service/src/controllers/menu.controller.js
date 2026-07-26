'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const MenuService = require('../services/menu.service');
const RoleService = require('../services/role.service');

class MenuController {
  static list = asyncHandler(async (req, res) => {
    const result = await MenuService.listAll(req.query);
    return ApiResponse.ok(res, result, 'Menus fetched');
  });

  static get = asyncHandler(async (req, res) => {
    const menu = await MenuService.getById(req.params.id);
    return ApiResponse.ok(res, menu, 'Menu fetched');
  });

  static create = asyncHandler(async (req, res) => {
    const menu = await MenuService.create(req.body, req.user.id);
    return ApiResponse.created(res, menu, 'Menu created');
  });

  static update = asyncHandler(async (req, res) => {
    const menu = await MenuService.update(req.params.id, req.body, req.user.id);
    return ApiResponse.ok(res, menu, 'Menu updated');
  });

  static remove = asyncHandler(async (req, res) => {
    const result = await MenuService.remove(req.params.id, req.user.id);
    return ApiResponse.ok(res, result, 'Menu deleted');
  });

  static reorder = asyncHandler(async (req, res) => {
    const result = await MenuService.reorder(req.body.items, req.user.id);
    return ApiResponse.ok(res, result, 'Menus reordered');
  });

  /** Navigation of the signed-in user, driven by their role and permissions. */
  static myNavigation = asyncHandler(async (req, res) => {
    const navigation = await MenuService.navigationForRole(req.user.roleId, req.user.permissions);
    return ApiResponse.ok(res, navigation, 'Navigation fetched');
  });

  static roleNavigation = asyncHandler(async (req, res) => {
    const permissions = await RoleService.permissions(req.params.roleId);
    const navigation = await MenuService.navigationForRole(req.params.roleId, permissions);
    return ApiResponse.ok(res, navigation, 'Role navigation fetched');
  });

  static roleMenus = asyncHandler(async (req, res) => {
    const result = await MenuService.roleMenus(req.params.roleId);
    return ApiResponse.ok(res, result, 'Role menu assignments fetched');
  });

  static setRoleMenus = asyncHandler(async (req, res) => {
    const result = await MenuService.setRoleMenus(req.params.roleId, req.body.items, req.user.id);
    return ApiResponse.ok(res, result, 'Role menus updated');
  });
}

module.exports = MenuController;
