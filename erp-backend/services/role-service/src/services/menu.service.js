'use strict';

const { ApiError, constants } = require('@erp/shared');
const MenuRepository = require('../repositories/menu.repository');
const RoleRepository = require('../repositories/role.repository');
const CacheService = require('./cache.service');
const { buildTree, collectPaths } = require('../utils/menuTree');
const { MENU_TYPE, CACHE } = require('../constants');
const config = require('../config');

const SUPER_ADMIN_PERMISSION = constants.PERMISSION_META.SUPER_ADMIN_PERMISSION;

class MenuService {
  /** Full admin view: every menu, no permission filtering. */
  static async listAll(query = {}) {
    const rows = await MenuRepository.findAll({
      type: query.type || null,
      includeInactive: true
    });
    return { flat: rows, tree: buildTree(rows, [SUPER_ADMIN_PERMISSION]) };
  }

  static async getById(id) {
    const menu = await MenuRepository.findById(id);
    if (!menu) throw ApiError.notFound('Menu not found');
    return menu;
  }

  static async create(payload, actorId) {
    if (await MenuRepository.findByCode(payload.code)) {
      throw ApiError.conflict('A menu with this code already exists', { field: 'code' });
    }

    if (payload.parentId) {
      const parent = await MenuRepository.findById(payload.parentId);
      if (!parent) throw ApiError.badRequest('Parent menu not found', { field: 'parentId' });
      if (parent.type !== (payload.type || MENU_TYPE.SIDEBAR)) {
        throw ApiError.badRequest('Child menu type must match its parent');
      }
    }

    const menu = await MenuRepository.create(
      {
        code: payload.code,
        label: payload.label,
        icon: payload.icon || null,
        path: payload.path || null,
        type: payload.type || MENU_TYPE.SIDEBAR,
        module: payload.module || null,
        permissionCode: payload.permissionCode || null,
        badgeKey: payload.badgeKey || null,
        parentId: payload.parentId || null,
        sortOrder: payload.sortOrder ?? 0,
        isActive: payload.isActive !== false,
        meta: payload.meta || null
      },
      actorId
    );

    await CacheService.bustRbac('menu-created');
    return menu;
  }

  static async update(id, payload, actorId) {
    const menu = await MenuRepository.findById(id);
    if (!menu) throw ApiError.notFound('Menu not found');

    if (payload.parentId) {
      if (payload.parentId === id) throw ApiError.badRequest('A menu cannot be its own parent');
      const parent = await MenuRepository.findById(payload.parentId);
      if (!parent) throw ApiError.badRequest('Parent menu not found', { field: 'parentId' });
      if (parent.parentId === id) {
        throw ApiError.badRequest('Circular menu hierarchy is not allowed');
      }
    }

    const updated = await MenuRepository.update(id, payload, actorId);
    await CacheService.bustRbac('menu-updated');
    return updated;
  }

  static async remove(id, actorId) {
    const menu = await MenuRepository.findById(id);
    if (!menu) throw ApiError.notFound('Menu not found');

    await MenuRepository.softDelete(id, actorId);
    await CacheService.bustRbac('menu-deleted');
    return { deleted: true, cascadedChildren: await MenuRepository.hasChildren(id) };
  }

  static async reorder(items, actorId) {
    await MenuRepository.reorder(items, actorId);
    await CacheService.bustRbac('menu-reordered');
    return { reordered: items.length };
  }

  /**
   * Navigation for one role: sidebar, header, dashboard widgets, quick actions
   * and allowed route paths. Explicit role-menu assignments win over
   * permission-driven defaults.
   */
  static async navigationForRole(roleId, permissions) {
    return CacheService.remember(CACHE.navigation(roleId), config.cache.menuTtl, async () => {
      const role = await RoleRepository.findById(roleId);
      if (!role) throw ApiError.notFound('Role not found');

      const [rows, assignments] = await Promise.all([
        MenuRepository.findAll({ includeInactive: false }),
        MenuRepository.assignedToRole(roleId)
      ]);

      const overrides = new Map(assignments.map((item) => [item.menuId, item]));
      const scoped = assignments.length
        ? rows.filter((row) => overrides.has(row.id) || rows.some((child) => child.parentId === row.id && overrides.has(child.id)))
        : rows;

      const sidebar = buildTree(scoped.filter((r) => r.type === MENU_TYPE.SIDEBAR), permissions, overrides);
      const header = buildTree(scoped.filter((r) => r.type === MENU_TYPE.HEADER), permissions, overrides);
      const widgets = buildTree(scoped.filter((r) => r.type === MENU_TYPE.DASHBOARD_WIDGET), permissions, overrides);
      const quickActions = buildTree(scoped.filter((r) => r.type === MENU_TYPE.QUICK_ACTION), permissions, overrides);

      return {
        role: { id: role.id, code: role.code, name: role.name, landingPath: role.landingPath },
        landingPath: role.landingPath,
        sidebar,
        header,
        dashboardWidgets: widgets,
        quickActions,
        allowedPaths: [...new Set([...collectPaths(sidebar), ...collectPaths(header)])]
      };
    });
  }

  static async roleMenus(roleId) {
    const role = await RoleRepository.findById(roleId);
    if (!role) throw ApiError.notFound('Role not found');
    const assignments = await MenuRepository.assignedToRole(roleId);
    return { roleId, assigned: assignments, mode: assignments.length ? 'EXPLICIT' : 'PERMISSION_DRIVEN' };
  }

  static async setRoleMenus(roleId, items, actorId) {
    const role = await RoleRepository.findById(roleId);
    if (!role) throw ApiError.notFound('Role not found');

    const menuIds = items.map((item) => item.menuId);
    const existing = await Promise.all(menuIds.map((menuId) => MenuRepository.findById(menuId)));
    const missing = menuIds.filter((menuId, index) => !existing[index]);

    if (missing.length) throw ApiError.badRequest('Unknown menu ids supplied', { missing });

    const count = await MenuRepository.replaceRoleMenus(roleId, items, actorId);
    await CacheService.bustRbac('role-menus-changed');

    return { roleId, assignedMenus: count };
  }
}

module.exports = MenuService;
