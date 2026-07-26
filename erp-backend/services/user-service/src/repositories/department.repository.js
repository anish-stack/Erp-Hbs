'use strict';

const { prisma } = require('../config/prisma');

const SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  headUserId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { users: true } }
};

class DepartmentRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.department.findMany({ where, skip, take, orderBy, select: SELECT }),
      prisma.department.count({ where })
    ]);
    return { items, total };
  }

  static async findAllActive() {
    return prisma.department.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true }
    });
  }

  static async findById(id) {
    return prisma.department.findFirst({ where: { id, deletedAt: null }, select: SELECT });
  }

  static async findByCode(code) {
    return prisma.department.findFirst({ where: { code, deletedAt: null } });
  }

  static async create(data, actorId) {
    return prisma.department.create({
      data: { ...data, createdBy: actorId, updatedBy: actorId },
      select: SELECT
    });
  }

  static async update(id, data, actorId) {
    return prisma.department.update({
      where: { id },
      data: { ...data, updatedBy: actorId },
      select: SELECT
    });
  }

  static async softDelete(id, actorId) {
    return prisma.department.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actorId, isActive: false }
    });
  }

  static async countUsers(id) {
    return prisma.user.count({ where: { departmentId: id, deletedAt: null } });
  }
}

module.exports = DepartmentRepository;
