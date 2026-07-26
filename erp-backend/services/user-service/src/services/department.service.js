'use strict';

const { ApiError, utils, cache } = require('@erp/shared');
const DepartmentRepository = require('../repositories/department.repository');
const UserRepository = require('../repositories/user.repository');
const publisher = require('../events/publisher');
const { CACHE } = require('../constants');

function shape(department) {
  return {
    id: department.id,
    code: department.code,
    name: department.name,
    description: department.description,
    headUserId: department.headUserId,
    isActive: department.isActive,
    userCount: department._count ? department._count.users : undefined,
    createdAt: department.createdAt,
    updatedAt: department.updatedAt
  };
}

class DepartmentService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['code', 'name', 'createdAt'],
      defaultSortField: 'name',
      defaultSortOrder: 'asc'
    });

    const where = utils.queryBuilder.buildWhere(query, {
      searchFields: ['code', 'name', 'description'],
      filterFields: { isActive: 'boolean' }
    });

    const { items, total } = await DepartmentRepository.paginate({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy
    });

    return { items: items.map(shape), total, page: pagination.page, limit: pagination.limit };
  }

  static async options() {
    return DepartmentRepository.findAllActive();
  }

  static async getById(id) {
    const department = await DepartmentRepository.findById(id);
    if (!department) throw ApiError.notFound('Department not found');
    return shape(department);
  }

  static async create(payload, actorId) {
    const code = payload.code.trim().toUpperCase();
    if (await DepartmentRepository.findByCode(code)) {
      throw ApiError.conflict('A department with this code already exists', { field: 'code' });
    }

    if (payload.headUserId) {
      const head = await UserRepository.findRawById(payload.headUserId);
      if (!head) throw ApiError.badRequest('Department head not found', { field: 'headUserId' });
    }

    const department = await DepartmentRepository.create(
      {
        code,
        name: payload.name,
        description: payload.description || null,
        headUserId: payload.headUserId || null,
        isActive: payload.isActive !== false
      },
      actorId
    );

    await cache.del(CACHE.stats());
    await publisher.audit({ entity: 'department', action: 'CREATE', entityId: department.id }, actorId);

    return shape(department);
  }

  static async update(id, payload, actorId) {
    const existing = await DepartmentRepository.findById(id);
    if (!existing) throw ApiError.notFound('Department not found');

    if (payload.code && payload.code.toUpperCase() !== existing.code) {
      const duplicate = await DepartmentRepository.findByCode(payload.code.toUpperCase());
      if (duplicate) throw ApiError.conflict('A department with this code already exists', { field: 'code' });
    }

    if (payload.headUserId) {
      const head = await UserRepository.findRawById(payload.headUserId);
      if (!head) throw ApiError.badRequest('Department head not found', { field: 'headUserId' });
    }

    const data = { ...payload };
    if (data.code) data.code = data.code.toUpperCase();

    const department = await DepartmentRepository.update(id, data, actorId);
    await publisher.audit({ entity: 'department', action: 'UPDATE', entityId: id }, actorId);

    return shape(department);
  }

  static async remove(id, actorId) {
    const existing = await DepartmentRepository.findById(id);
    if (!existing) throw ApiError.notFound('Department not found');

    const userCount = await DepartmentRepository.countUsers(id);
    if (userCount > 0) {
      throw ApiError.conflict(
        `Department has ${userCount} active user(s). Reassign them before deleting`,
        { userCount }
      );
    }

    await DepartmentRepository.softDelete(id, actorId);
    await cache.del(CACHE.stats());
    await publisher.audit({ entity: 'department', action: 'DELETE', entityId: id }, actorId);

    return { deleted: true };
  }
}

module.exports = DepartmentService;
