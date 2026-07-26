'use strict';

const { prisma } = require('../config/prisma');

const LIST_SELECT = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  email: true,
  mobile: true,
  designation: true,
  avatarUrl: true,
  status: true,
  isEmailVerified: true,
  mustChangePassword: true,
  lastLoginAt: true,
  dateOfJoining: true,
  createdAt: true,
  role: { select: { id: true, code: true, name: true } },
  department: { select: { id: true, code: true, name: true } },
  reportsTo: { select: { id: true, firstName: true, lastName: true, email: true } }
};

const DETAIL_SELECT = {
  ...LIST_SELECT,
  dateOfBirth: true,
  timezone: true,
  locale: true,
  notes: true,
  passwordChangedAt: true,
  lastLoginIp: true,
  updatedAt: true,
  _count: { select: { directReports: true } }
};

class UserRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({ where, skip, take, orderBy, select: LIST_SELECT }),
      prisma.user.count({ where })
    ]);
    return { items, total };
  }

  static async streamAll(where, orderBy, handler, batchSize = 500) {
    let cursor = null;
    let processed = 0;

    for (;;) {
      const batch = await prisma.user.findMany({
        where,
        orderBy: [orderBy, { id: 'asc' }],
        take: batchSize,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: LIST_SELECT
      });

      if (!batch.length) break;

      await handler(batch);
      processed += batch.length;
      cursor = batch[batch.length - 1].id;

      if (batch.length < batchSize) break;
    }

    return processed;
  }

  static async findById(id) {
    return prisma.user.findFirst({ where: { id, deletedAt: null }, select: DETAIL_SELECT });
  }

  static async findRawById(id) {
    return prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  static async findByEmail(email) {
    return prisma.user.findFirst({ where: { email: email.toLowerCase(), deletedAt: null } });
  }

  static async findDuplicate({ email, mobile, employeeCode, excludeId = null }) {
    const or = [];
    if (email) or.push({ email: email.toLowerCase() });
    if (mobile) or.push({ mobile });
    if (employeeCode) or.push({ employeeCode });
    if (!or.length) return null;

    return prisma.user.findFirst({
      where: { OR: or, deletedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) }
    });
  }

  static async create(data, actorId) {
    return prisma.user.create({
      data: { ...data, email: data.email.toLowerCase(), createdBy: actorId, updatedBy: actorId },
      select: DETAIL_SELECT
    });
  }

  static async createMany(rows) {
    return prisma.user.createMany({ data: rows, skipDuplicates: true });
  }

  static async update(id, data, actorId) {
    return prisma.user.update({
      where: { id },
      data: { ...data, updatedBy: actorId },
      select: DETAIL_SELECT
    });
  }

  static async softDelete(id, actorId) {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actorId, status: 'INACTIVE' }
    });
  }

  static async countDirectReports(id) {
    return prisma.user.count({ where: { reportsToId: id, deletedAt: null } });
  }

  static async stats() {
    const [byStatus, byRole, byDepartment, total, recent] = await prisma.$transaction([
      prisma.user.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.user.groupBy({ by: ['roleId'], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.user.groupBy({
        by: ['departmentId'],
        where: { deletedAt: null },
        _count: { _all: true }
      }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({
        where: { deletedAt: null, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } }
      })
    ]);

    return { byStatus, byRole, byDepartment, total, recent };
  }

  static get LIST_SELECT() {
    return LIST_SELECT;
  }

  static get DETAIL_SELECT() {
    return DETAIL_SELECT;
  }
}

module.exports = UserRepository;
