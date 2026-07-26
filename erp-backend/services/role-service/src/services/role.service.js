'use strict';

const { ApiError, utils, constants } = require('@erp/shared');
const RoleRepository = require('../repositories/role.repository');
const PermissionService = require('./permission.service');
const CacheService = require('./cache.service');
const publisher = require('../events/publisher');
const { PROTECTED_ROLE_CODES, CACHE } = require('../constants');
const config = require('../config');

const SUPER_ADMIN_PERMISSION = constants.PERMISSION_META.SUPER_ADMIN_PERMISSION;

function shape(role) {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    isActive: role.isActive,
    landingPath: role.landingPath,
    userCount: role._count ? role._count.users : undefined,
    permissionCount: role._count ? role._count.permissions : undefined,
    menuCount: role._count ? role._count.menus : undefined,
    permissions: role.permissions
      ? role.permissions.map((rp) => ({
          id: rp.permission.id,
          code: rp.permission.code,
          module: rp.permission.module,
          action: rp.permission.action
        }))
      : undefined,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt
  };
}

function assertMutable(role, action) {
  if (PROTECTED_ROLE_CODES.includes(role.code)) {
    throw ApiError.forbidden(`System role ${role.code} cannot be ${action}`);
  }
}

class RoleService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['code', 'name', 'createdAt', 'updatedAt'],
      defaultSortField: 'createdAt'
    });

    const where = utils.queryBuilder.buildWhere(query, {
      searchFields: ['code', 'name', 'description'],
      filterFields: { isActive: 'boolean', isSystem: 'boolean' }
    });

    const { items, total } = await RoleRepository.paginate({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy
    });

    return {
      items: items.map(shape),
      total,
      page: pagination.page,
      limit: pagination.limit
    };
  }

  static async getById(id, { withPermissions = true } = {}) {
    const role = await RoleRepository.findById(id, { withPermissions });
    if (!role) throw ApiError.notFound('Role not found');
    return shape(role);
  }

  static async create(payload, actorId) {
    const code = payload.code.trim().toUpperCase().replace(/\s+/g, '_');

    if (await RoleRepository.findByCode(code)) {
      throw ApiError.conflict('A role with this code already exists', { field: 'code' });
    }

    const role = await RoleRepository.create(
      {
        code,
        name: payload.name,
        description: payload.description || null,
        landingPath: payload.landingPath || '/dashboard',
        isActive: payload.isActive !== false,
        isSystem: false
      },
      actorId
    );

    if (payload.permissionCodes || payload.permissionIds) {
      await RoleService.setPermissions(role.id, payload, actorId, { skipEvent: true });
    }

    await CacheService.bustRbac('role-created');
    await publisher.roleCreated(role, actorId);

    return RoleService.getById(role.id);
  }

  static async update(id, payload, actorId) {
    const role = await RoleRepository.findById(id);
    if (!role) throw ApiError.notFound('Role not found');

    if (payload.code && payload.code !== role.code) {
      assertMutable(role, 'renamed');
      if (role.isSystem) throw ApiError.forbidden('System role codes are immutable');
      const existing = await RoleRepository.findByCode(payload.code.toUpperCase());
      if (existing) throw ApiError.conflict('A role with this code already exists', { field: 'code' });
    }

    if (payload.isActive === false) assertMutable(role, 'deactivated');

    const data = {
      ...(payload.code ? { code: payload.code.toUpperCase().replace(/\s+/g, '_') } : {}),
      ...(payload.name ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.landingPath ? { landingPath: payload.landingPath } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {})
    };

    const updated = await RoleRepository.update(id, data, actorId);

    await CacheService.bustRole(id, 'role-updated');
    await publisher.roleUpdated(updated, Object.keys(data), actorId);

    return RoleService.getById(id);
  }

  static async remove(id, actorId) {
    const role = await RoleRepository.findById(id);
    if (!role) throw ApiError.notFound('Role not found');

    assertMutable(role, 'deleted');
    if (role.isSystem) throw ApiError.forbidden('System roles cannot be deleted');

    const userCount = await RoleRepository.countUsers(id);
    if (userCount > 0) {
      throw ApiError.conflict(
        `Role is assigned to ${userCount} user(s). Reassign them before deleting`,
        { userCount }
      );
    }

    await RoleRepository.softDelete(id, actorId);
    await CacheService.bustRbac('role-deleted');
    await publisher.roleDeleted(role, actorId);

    return { deleted: true };
  }

  static async permissions(roleId) {
    const role = await RoleRepository.findById(roleId);
    if (!role) throw ApiError.notFound('Role not found');

    return CacheService.remember(CACHE.rolePermissions(roleId), config.cache.roleTtl, () =>
      RoleRepository.permissionCodes(roleId)
    );
  }

  /** Replaces the whole permission set (idempotent, used by the admin matrix UI). */
  static async setPermissions(roleId, payload, actorId, options = {}) {
    const role = await RoleRepository.findById(roleId);
    if (!role) throw ApiError.notFound('Role not found');

    if (role.code === 'SUPER_ADMIN') {
      throw ApiError.forbidden('Super Admin permissions are fixed and cannot be modified');
    }

    const resolved = await PermissionService.resolveIds(payload);

    if (resolved.unknownCodes.length || resolved.unknownIds.length) {
      throw ApiError.badRequest('Unknown permissions supplied', {
        unknownCodes: resolved.unknownCodes,
        unknownIds: resolved.unknownIds
      });
    }

    const wildcard = resolved.permissions.find((p) => p.code === SUPER_ADMIN_PERMISSION);
    if (wildcard) {
      throw ApiError.forbidden('The wildcard permission can only belong to Super Admin');
    }

    const count = await RoleRepository.replacePermissions(
      roleId,
      resolved.permissions.map((p) => p.id),
      actorId
    );

    await CacheService.bustRbac('role-permissions-changed');

    if (!options.skipEvent) {
      await publisher.permissionsChanged(role, resolved.permissions.map((p) => p.code), actorId);
    }

    return { roleId, permissionCount: count, permissions: resolved.permissions.map((p) => p.code) };
  }

  static async addPermissions(roleId, payload, actorId) {
    const role = await RoleRepository.findById(roleId);
    if (!role) throw ApiError.notFound('Role not found');

    const resolved = await PermissionService.resolveIds(payload);
    if (!resolved.permissions.length) throw ApiError.badRequest('No valid permissions supplied');

    const count = await RoleRepository.addPermissions(
      roleId,
      resolved.permissions.map((p) => p.id),
      actorId
    );

    await CacheService.bustRbac('role-permissions-added');
    await publisher.permissionsChanged(role, await RoleRepository.permissionCodes(roleId), actorId);

    return { roleId, permissionCount: count, added: resolved.permissions.map((p) => p.code) };
  }

  static async removePermissions(roleId, payload, actorId) {
    const role = await RoleRepository.findById(roleId);
    if (!role) throw ApiError.notFound('Role not found');

    const resolved = await PermissionService.resolveIds(payload);
    if (!resolved.permissions.length) throw ApiError.badRequest('No valid permissions supplied');

    const removed = await RoleRepository.removePermissions(
      roleId,
      resolved.permissions.map((p) => p.id)
    );

    await CacheService.bustRbac('role-permissions-removed');
    await publisher.permissionsChanged(role, await RoleRepository.permissionCodes(roleId), actorId);

    return { roleId, removed };
  }

  /** Duplicates an existing role with its full permission set. */
  static async clone(roleId, payload, actorId) {
    const source = await RoleRepository.findById(roleId, { withPermissions: true });
    if (!source) throw ApiError.notFound('Role not found');

    const code = payload.code.trim().toUpperCase().replace(/\s+/g, '_');
    if (await RoleRepository.findByCode(code)) {
      throw ApiError.conflict('A role with this code already exists', { field: 'code' });
    }

    const clone = await RoleRepository.create(
      {
        code,
        name: payload.name,
        description: payload.description || `Cloned from ${source.name}`,
        landingPath: payload.landingPath || source.landingPath,
        isActive: true,
        isSystem: false
      },
      actorId
    );

    const permissionIds = source.permissions
      .filter((rp) => rp.permission.code !== SUPER_ADMIN_PERMISSION)
      .map((rp) => rp.permission.id);

    if (permissionIds.length) {
      await RoleRepository.replacePermissions(clone.id, permissionIds, actorId);
    }

    await CacheService.bustRbac('role-cloned');
    await publisher.roleCreated(clone, actorId);

    return RoleService.getById(clone.id);
  }
}

module.exports = RoleService;
