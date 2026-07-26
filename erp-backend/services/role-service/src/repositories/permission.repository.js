'use strict';

const { prisma } = require('../config/prisma');

class PermissionRepository {
  static async findAll() {
    return prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
      select: { id: true, code: true, module: true, action: true, description: true }
    });
  }

  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.permission.findMany({ where, skip, take, orderBy }),
      prisma.permission.count({ where })
    ]);
    return { items, total };
  }

  static async findByCodes(codes) {
    return prisma.permission.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true }
    });
  }

  static async findByIds(ids) {
    return prisma.permission.findMany({
      where: { id: { in: ids } },
      select: { id: true, code: true }
    });
  }

  static async upsertMany(permissions) {
    let created = 0;
    for (const permission of permissions) {
      const result = await prisma.permission.upsert({
        where: { code: permission.code },
        update: { module: permission.module, action: permission.action },
        create: permission
      });
      if (result) created += 1;
    }
    return created;
  }

  static async modules() {
    const rows = await prisma.permission.findMany({
      distinct: ['module'],
      select: { module: true },
      orderBy: { module: 'asc' }
    });
    return rows.map((row) => row.module);
  }
}

module.exports = PermissionRepository;
