'use strict';

const { prisma } = require('../config/prisma');

const LIST_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  isSystem: true,
  isActive: true,
  landingPath: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { users: true, permissions: true, menus: true } }
};

class RoleRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.role.findMany({ where, skip, take, orderBy, select: LIST_SELECT }),
      prisma.role.count({ where })
    ]);
    return { items, total };
  }

  static async findById(id, { withPermissions = false } = {}) {
    return prisma.role.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { users: true } },
        permissions: withPermissions
          ? { include: { permission: { select: { id: true, code: true, module: true, action: true } } } }
          : false
      }
    });
  }

  static async findByCode(code) {
    return prisma.role.findFirst({ where: { code, deletedAt: null } });
  }

  static async create(data, actorId) {
    return prisma.role.create({ data: { ...data, createdBy: actorId, updatedBy: actorId } });
  }

  static async update(id, data, actorId) {
    return prisma.role.update({ where: { id }, data: { ...data, updatedBy: actorId } });
  }

  static async softDelete(id, actorId) {
    return prisma.role.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actorId, isActive: false }
    });
  }

  static async countUsers(roleId) {
    return prisma.user.count({ where: { roleId, deletedAt: null } });
  }

  static async permissionCodes(roleId) {
    const rows = await prisma.rolePermission.findMany({
      where: { roleId },
      select: { permission: { select: { code: true } } }
    });
    return rows.map((row) => row.permission.code);
  }

  /** Replaces the permission set atomically. */
  static async replacePermissions(roleId, permissionIds, actorId) {
    return prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (permissionIds.length) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId, permissionId, createdBy: actorId })),
          skipDuplicates: true
        });
      }
      return tx.rolePermission.count({ where: { roleId } });
    });
  }

  static async addPermissions(roleId, permissionIds, actorId) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId, permissionId, createdBy: actorId })),
      skipDuplicates: true
    });
    return prisma.rolePermission.count({ where: { roleId } });
  }

  static async removePermissions(roleId, permissionIds) {
    const result = await prisma.rolePermission.deleteMany({
      where: { roleId, permissionId: { in: permissionIds } }
    });
    return result.count;
  }

  static get LIST_SELECT() {
    return LIST_SELECT;
  }
}

module.exports = RoleRepository;
