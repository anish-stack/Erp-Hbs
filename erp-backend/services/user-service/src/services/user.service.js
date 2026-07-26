'use strict';

const { ApiError, utils, cache, logger } = require('@erp/shared');
const { prisma } = require('../config/prisma');
const UserRepository = require('../repositories/user.repository');
const DepartmentRepository = require('../repositories/department.repository');
const publisher = require('../events/publisher');
const { shape } = require('../utils/userShape');
const { USER_STATUS, CACHE } = require('../constants');
const config = require('../config');

const SELF_EDITABLE = ['firstName', 'lastName', 'mobile', 'avatarUrl', 'timezone', 'locale', 'dateOfBirth'];

async function assertRole(roleId) {
  const role = await prisma.role.findFirst({ where: { id: roleId, deletedAt: null, isActive: true } });
  if (!role) throw ApiError.badRequest('Role not found or inactive', { field: 'roleId' });
  return role;
}

async function assertDepartment(departmentId) {
  if (!departmentId) return null;
  const department = await DepartmentRepository.findById(departmentId);
  if (!department) throw ApiError.badRequest('Department not found', { field: 'departmentId' });
  return department;
}

/** Walks the reporting chain upwards to stop cycles (A -> B -> A). */
async function assertReportingChain(userId, reportsToId) {
  if (!reportsToId) return;
  if (userId && reportsToId === userId) {
    throw ApiError.badRequest('A user cannot report to themselves', { field: 'reportsToId' });
  }

  const manager = await UserRepository.findRawById(reportsToId);
  if (!manager) throw ApiError.badRequest('Reporting manager not found', { field: 'reportsToId' });

  if (!userId) return;

  let current = manager;
  let depth = 0;
  while (current && current.reportsToId && depth < 20) {
    if (current.reportsToId === userId) {
      throw ApiError.badRequest('Circular reporting hierarchy is not allowed', {
        field: 'reportsToId'
      });
    }
    current = await UserRepository.findRawById(current.reportsToId);
    depth += 1;
  }
}

class UserService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['createdAt', 'firstName', 'email', 'employeeCode', 'lastLoginAt'],
      defaultSortField: 'createdAt'
    });

    const where = utils.queryBuilder.buildWhere(query, {
      searchFields: ['firstName', 'lastName', 'email', 'employeeCode', 'mobile', 'designation'],
      filterFields: {
        status: 'string',
        roleId: 'string',
        departmentId: 'string',
        reportsToId: 'string',
        isEmailVerified: 'boolean'
      }
    });

    const { items, total } = await UserRepository.paginate({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy
    });

    return { items: items.map(shape), total, page: pagination.page, limit: pagination.limit };
  }

  static async getById(id) {
    const cached = await cache.get(CACHE.user(id));
    if (cached) return cached;

    const user = await UserRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');

    const shaped = shape(user);
    await cache.set(CACHE.user(id), shaped, config.cache.userTtl);
    return shaped;
  }

  static async create(payload, actorId) {
    const duplicate = await UserRepository.findDuplicate(payload);
    if (duplicate) {
      const field =
        duplicate.email === payload.email.toLowerCase()
          ? 'email'
          : duplicate.employeeCode === payload.employeeCode
            ? 'employeeCode'
            : 'mobile';
      throw ApiError.conflict(`A user with this ${field} already exists`, { field });
    }

    await assertRole(payload.roleId);
    await assertDepartment(payload.departmentId);
    await assertReportingChain(null, payload.reportsToId);

    const user = await UserRepository.create(
      {
        employeeCode: payload.employeeCode,
        firstName: payload.firstName,
        lastName: payload.lastName || null,
        email: payload.email,
        mobile: payload.mobile || null,
        designation: payload.designation || null,
        password: await utils.password.hash(payload.password),
        roleId: payload.roleId,
        departmentId: payload.departmentId || null,
        reportsToId: payload.reportsToId || null,
        dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
        dateOfJoining: payload.dateOfJoining ? new Date(payload.dateOfJoining) : null,
        notes: payload.notes || null,
        timezone: payload.timezone || 'Asia/Kolkata',
        locale: payload.locale || 'en-IN',
        status: payload.status || USER_STATUS.ACTIVE,
        mustChangePassword: payload.mustChangePassword !== false
      },
      actorId
    );

    await cache.del(CACHE.stats());
    await publisher.created(user, actorId);

    return shape(user);
  }

  static async update(id, payload, actorId) {
    const existing = await UserRepository.findRawById(id);
    if (!existing) throw ApiError.notFound('User not found');

    if (payload.email || payload.mobile || payload.employeeCode) {
      const duplicate = await UserRepository.findDuplicate({ ...payload, excludeId: id });
      if (duplicate) throw ApiError.conflict('Email, mobile or employee code already in use');
    }

    if (payload.roleId && payload.roleId !== existing.roleId) await assertRole(payload.roleId);
    if (payload.departmentId !== undefined) await assertDepartment(payload.departmentId);
    if (payload.reportsToId !== undefined) await assertReportingChain(id, payload.reportsToId);

    const data = { ...payload };
    if (data.email) data.email = data.email.toLowerCase();
    if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);
    if (data.dateOfJoining) data.dateOfJoining = new Date(data.dateOfJoining);
    delete data.password;
    delete data.status;

    const user = await UserRepository.update(id, data, actorId);

    await cache.del(CACHE.user(id), CACHE.stats());
    await publisher.updated(id, Object.keys(data), actorId);

    return shape(user);
  }

  /** Self-service profile update: only a safe subset of fields is writable. */
  static async updateOwnProfile(userId, payload) {
    const data = {};
    for (const key of SELF_EDITABLE) {
      if (payload[key] !== undefined) data[key] = payload[key];
    }
    if (!Object.keys(data).length) throw ApiError.badRequest('No editable fields supplied');
    if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);

    if (data.mobile) {
      const duplicate = await UserRepository.findDuplicate({ mobile: data.mobile, excludeId: userId });
      if (duplicate) throw ApiError.conflict('Mobile number already in use', { field: 'mobile' });
    }

    const user = await UserRepository.update(userId, data, userId);
    await cache.del(CACHE.user(userId));
    await publisher.updated(userId, Object.keys(data), userId);

    return shape(user);
  }

  static async changeStatus(id, status, actorId) {
    const existing = await UserRepository.findRawById(id);
    if (!existing) throw ApiError.notFound('User not found');

    if (existing.id === actorId && status !== USER_STATUS.ACTIVE) {
      throw ApiError.badRequest('You cannot deactivate your own account');
    }
    if (existing.status === status) {
      return { id, status, unchanged: true };
    }

    const user = await UserRepository.update(id, { status }, actorId);

    await cache.del(CACHE.user(id), CACHE.stats());
    await publisher.statusChanged(id, status, existing.status, actorId);

    logger.info('User %s status %s -> %s by %s', id, existing.status, status, actorId);
    return shape(user);
  }

  static async changeRole(id, roleId, actorId) {
    const existing = await UserRepository.findRawById(id);
    if (!existing) throw ApiError.notFound('User not found');

    const role = await assertRole(roleId);

    if (existing.id === actorId && existing.roleId !== roleId) {
      throw ApiError.badRequest('You cannot change your own role');
    }

    const user = await UserRepository.update(id, { roleId }, actorId);

    await cache.del(CACHE.user(id), CACHE.stats());
    await cache.delByPattern('rbac:*');
    await publisher.roleChanged(id, roleId, existing.roleId, actorId);

    logger.info('User %s role changed to %s by %s', id, role.code, actorId);
    return shape(user);
  }

  /** Admin-driven password reset: forces a change on next login. */
  static async resetPassword(id, newPassword, actorId) {
    const existing = await UserRepository.findRawById(id);
    if (!existing) throw ApiError.notFound('User not found');

    await UserRepository.update(
      id,
      {
        password: await utils.password.hash(newPassword),
        passwordChangedAt: new Date(),
        mustChangePassword: true,
        failedLoginCount: 0,
        lockedUntil: null
      },
      actorId
    );

    await cache.del(CACHE.user(id));
    await publisher.emit('auth.user.password_changed', { userId: id, reason: 'ADMIN_RESET' }, actorId);

    return { message: 'Password reset. The user must change it at next sign-in' };
  }

  static async unlock(id, actorId) {
    const existing = await UserRepository.findRawById(id);
    if (!existing) throw ApiError.notFound('User not found');

    await UserRepository.update(id, { failedLoginCount: 0, lockedUntil: null }, actorId);
    await cache.del(CACHE.user(id));

    return { message: 'Account unlocked' };
  }

  static async remove(id, actorId) {
    const existing = await UserRepository.findRawById(id);
    if (!existing) throw ApiError.notFound('User not found');

    if (id === actorId) throw ApiError.badRequest('You cannot delete your own account');

    const reports = await UserRepository.countDirectReports(id);
    if (reports > 0) {
      throw ApiError.conflict(
        `${reports} user(s) report to this user. Reassign them before deleting`,
        { directReports: reports }
      );
    }

    await UserRepository.softDelete(id, actorId);

    await cache.del(CACHE.user(id), CACHE.stats());
    await publisher.deleted(id, actorId);

    return { deleted: true };
  }

  static async directReports(id) {
    const { items } = await UserRepository.paginate({
      where: { reportsToId: id, deletedAt: null },
      skip: 0,
      take: 100,
      orderBy: { firstName: 'asc' }
    });
    return items.map(shape);
  }

  static async stats() {
    return cache.remember(CACHE.stats(), config.cache.userTtl, async () => {
      const raw = await UserRepository.stats();

      const roles = await prisma.role.findMany({
        where: { id: { in: raw.byRole.map((r) => r.roleId) } },
        select: { id: true, code: true, name: true }
      });
      const departments = await prisma.department.findMany({
        where: { id: { in: raw.byDepartment.map((d) => d.departmentId).filter(Boolean) } },
        select: { id: true, code: true, name: true }
      });

      return {
        total: raw.total,
        createdLast30Days: raw.recent,
        byStatus: raw.byStatus.map((row) => ({ status: row.status, count: row._count._all })),
        byRole: raw.byRole.map((row) => ({
          roleId: row.roleId,
          role: roles.find((r) => r.id === row.roleId) || null,
          count: row._count._all
        })),
        byDepartment: raw.byDepartment.map((row) => ({
          departmentId: row.departmentId,
          department: departments.find((d) => d.id === row.departmentId) || null,
          count: row._count._all
        }))
      };
    });
  }
}

module.exports = UserService;
