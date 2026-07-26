'use strict';

const { utils, constants } = require('@erp/shared');
const PermissionRepository = require('../repositories/permission.repository');
const CacheService = require('./cache.service');
const { CACHE } = require('../constants');
const config = require('../config');

const { MODULES, ACTIONS, SUPER_ADMIN_PERMISSION } = constants.PERMISSION_META;

class PermissionService {
  /** Module-grouped matrix used to render permission checkboxes in the admin UI. */
  static async matrix() {
    return CacheService.remember(CACHE.permissionMatrix(), config.cache.permissionTtl, async () => {
      const permissions = await PermissionRepository.findAll();
      const grouped = new Map();

      for (const permission of permissions) {
        if (permission.code === SUPER_ADMIN_PERMISSION) continue;
        if (!grouped.has(permission.module)) grouped.set(permission.module, []);
        grouped.get(permission.module).push({
          id: permission.id,
          code: permission.code,
          action: permission.action,
          description: permission.description
        });
      }

      return {
        modules: Array.from(grouped.entries()).map(([module, actions]) => ({
          module,
          label: module.charAt(0).toUpperCase() + module.slice(1),
          actions: actions.sort((a, b) => a.action.localeCompare(b.action))
        })),
        totalPermissions: permissions.length
      };
    });
  }

  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['code', 'module', 'action', 'createdAt'],
      defaultSortField: 'module',
      defaultSortOrder: 'asc'
    });

    const where = utils.queryBuilder.buildWhere(query, {
      searchFields: ['code', 'module', 'action', 'description'],
      filterFields: { module: 'string', action: 'string' },
      softDelete: false
    });

    const { items, total } = await PermissionRepository.paginate({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy
    });

    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  static async modules() {
    return PermissionRepository.modules();
  }

  /** Regenerates the permission catalogue from the shared constants. */
  static async sync() {
    const rows = [
      { code: SUPER_ADMIN_PERMISSION, module: '*', action: '*', description: 'Full system access' },
      ...MODULES.flatMap((module) =>
        ACTIONS.map((action) => ({
          code: `${module}.${action}`,
          module,
          action,
          description: `${action} ${module}`
        }))
      )
    ];

    const count = await PermissionRepository.upsertMany(rows);
    await CacheService.bustRbac('permission-sync');

    return { synced: count, modules: MODULES.length, actions: ACTIONS.length };
  }

  static async resolveIds({ permissionIds = [], permissionCodes = [] }) {
    const byId = permissionIds.length ? await PermissionRepository.findByIds(permissionIds) : [];
    const byCode = permissionCodes.length
      ? await PermissionRepository.findByCodes(permissionCodes)
      : [];

    const merged = new Map();
    for (const permission of [...byId, ...byCode]) merged.set(permission.id, permission);

    const found = Array.from(merged.values());
    const foundCodes = new Set(found.map((p) => p.code));
    const foundIds = new Set(found.map((p) => p.id));

    return {
      permissions: found,
      unknownCodes: permissionCodes.filter((code) => !foundCodes.has(code)),
      unknownIds: permissionIds.filter((id) => !foundIds.has(id))
    };
  }
}

module.exports = PermissionService;
