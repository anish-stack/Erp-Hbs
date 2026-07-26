'use strict';

const { prisma } = require('../config/prisma');

const IDENTITY_INCLUDE = {
  role: {
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      landingPath: true,
      permissions: { select: { permission: { select: { code: true } } } }
    }
  },
  department: { select: { id: true, code: true, name: true } }
};

const SAFE_SELECT = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  email: true,
  mobile: true,
  designation: true,
  status: true,
  isEmailVerified: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
  roleId: true,
  departmentId: true
};

class UserRepository {
  static async findByEmail(email, { withRole = true } = {}) {
    return prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      include: withRole ? IDENTITY_INCLUDE : undefined
    });
  }

  static async findById(id, { withRole = true } = {}) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: withRole ? IDENTITY_INCLUDE : undefined
    });
  }

  static async findSafeById(id) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { ...SAFE_SELECT, role: { select: { id: true, code: true, name: true, landingPath: true } } }
    });
  }

  static async findByEmailOrMobileOrCode({ email, mobile, employeeCode }) {
    const or = [];
    if (email) or.push({ email: email.toLowerCase() });
    if (mobile) or.push({ mobile });
    if (employeeCode) or.push({ employeeCode });
    if (!or.length) return null;
    return prisma.user.findFirst({ where: { OR: or, deletedAt: null } });
  }

  static async create(data, actorId = null) {
    return prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
        createdBy: actorId,
        updatedBy: actorId
      },
      include: IDENTITY_INCLUDE
    });
  }

  static async updateById(id, data, actorId = null) {
    return prisma.user.update({
      where: { id },
      data: { ...data, updatedBy: actorId }
    });
  }

  static async setPassword(id, hashedPassword, actorId = null) {
    return prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
        updatedBy: actorId
      }
    });
  }

  static async registerSuccessfulLogin(id, ipAddress) {
    return prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress || null,
        failedLoginCount: 0,
        lockedUntil: null
      }
    });
  }

  static async registerFailedLogin(id, { lock = false, lockedUntil = null } = {}) {
    return prisma.user.update({
      where: { id },
      data: {
        failedLoginCount: { increment: 1 },
        ...(lock ? { lockedUntil } : {})
      }
    });
  }

  static get SAFE_SELECT() {
    return SAFE_SELECT;
  }
}

module.exports = UserRepository;
