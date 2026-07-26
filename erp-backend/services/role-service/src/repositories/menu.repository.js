'use strict';

const { prisma } = require('../config/prisma');

const MENU_SELECT = {
  id: true,
  code: true,
  label: true,
  icon: true,
  path: true,
  type: true,
  module: true,
  permissionCode: true,
  badgeKey: true,
  parentId: true,
  sortOrder: true,
  isActive: true,
  meta: true
};

class MenuRepository {
  static async findAll({ type = null, includeInactive = false } = {}) {
    return prisma.menu.findMany({
      where: {
        deletedAt: null,
        ...(type ? { type } : {}),
        ...(includeInactive ? {} : { isActive: true })
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      select: MENU_SELECT
    });
  }

  static async findById(id) {
    return prisma.menu.findFirst({ where: { id, deletedAt: null }, select: MENU_SELECT });
  }

  static async findByCode(code) {
    return prisma.menu.findFirst({ where: { code, deletedAt: null } });
  }

  static async create(data, actorId) {
    return prisma.menu.create({ data: { ...data, createdBy: actorId, updatedBy: actorId } });
  }

  static async update(id, data, actorId) {
    return prisma.menu.update({ where: { id }, data: { ...data, updatedBy: actorId } });
  }

  static async softDelete(id, actorId) {
    return prisma.$transaction(async (tx) => {
      await tx.menu.updateMany({
        where: { parentId: id, deletedAt: null },
        data: { deletedAt: new Date(), deletedBy: actorId, isActive: false }
      });
      return tx.menu.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy: actorId, isActive: false }
      });
    });
  }

  static async hasChildren(id) {
    return (await prisma.menu.count({ where: { parentId: id, deletedAt: null } })) > 0;
  }

  static async reorder(items, actorId) {
    return prisma.$transaction(
      items.map((item) =>
        prisma.menu.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder, parentId: item.parentId || null, updatedBy: actorId }
        })
      )
    );
  }

  /** Menus explicitly assigned to a role (empty = permission-driven defaults). */
  static async assignedToRole(roleId) {
    return prisma.roleMenu.findMany({
      where: { roleId, isVisible: true },
      select: { menuId: true, sortOrder: true }
    });
  }

  static async replaceRoleMenus(roleId, items, actorId) {
    return prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { roleId } });
      if (items.length) {
        await tx.roleMenu.createMany({
          data: items.map((item) => ({
            roleId,
            menuId: item.menuId,
            sortOrder: item.sortOrder ?? null,
            isVisible: item.isVisible !== false,
            createdBy: actorId
          })),
          skipDuplicates: true
        });
      }
      return tx.roleMenu.count({ where: { roleId } });
    });
  }

  static get MENU_SELECT() {
    return MENU_SELECT;
  }
}

module.exports = MenuRepository;
