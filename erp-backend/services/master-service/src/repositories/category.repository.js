'use strict';

const { prisma } = require('../config/prisma');

const SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  parentId: true,
  path: true,
  level: true,
  sortOrder: true,
  iconKey: true,
  isActive: true,
  createdAt: true,
  _count: { select: { parts: true, children: true } }
};

class CategoryRepository {
  static async all({ includeInactive = false } = {}) {
    return prisma.category.findMany({
      where: { deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
      select: SELECT
    });
  }

  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.category.findMany({ where, skip, take, orderBy, select: SELECT }),
      prisma.category.count({ where })
    ]);
    return { items, total };
  }

  static async findById(id) {
    return prisma.category.findFirst({ where: { id, deletedAt: null }, select: SELECT });
  }

  static async findByCode(code) {
    return prisma.category.findFirst({ where: { code, deletedAt: null } });
  }

  static async create(data, actorId) {
    return prisma.category.create({
      data: { ...data, createdBy: actorId, updatedBy: actorId },
      select: SELECT
    });
  }

  static async update(id, data, actorId) {
    return prisma.category.update({
      where: { id },
      data: { ...data, updatedBy: actorId },
      select: SELECT
    });
  }

  static async descendants(path) {
    return prisma.category.findMany({
      where: { deletedAt: null, OR: [{ path }, { path: { startsWith: `${path}/` } }] },
      select: { id: true, path: true, level: true, code: true }
    });
  }

  /** Re-parenting rewrites the materialised path of the whole subtree. */
  static async repath(oldPath, newPath, levelDelta) {
    const subtree = await prisma.category.findMany({
      where: { deletedAt: null, OR: [{ path: oldPath }, { path: { startsWith: `${oldPath}/` } }] },
      select: { id: true, path: true, level: true }
    });

    return prisma.$transaction(
      subtree.map((node) =>
        prisma.category.update({
          where: { id: node.id },
          data: {
            path: `${newPath}${node.path.slice(oldPath.length)}`,
            level: node.level + levelDelta
          }
        })
      )
    );
  }

  static async softDelete(id, actorId) {
    return prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actorId, isActive: false }
    });
  }

  static async countParts(id) {
    return prisma.part.count({ where: { categoryId: id, deletedAt: null } });
  }

  static async countChildren(id) {
    return prisma.category.count({ where: { parentId: id, deletedAt: null } });
  }
}

module.exports = CategoryRepository;
