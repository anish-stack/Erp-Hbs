'use strict';

const { prisma } = require('../config/prisma');

const SELECT = {
  id: true,
  code: true,
  name: true,
  aliases: true,
  country: true,
  website: true,
  logoFileId: true,
  description: true,
  isApproved: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { parts: true } }
};

class ManufacturerRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.manufacturer.findMany({ where, skip, take, orderBy, select: SELECT }),
      prisma.manufacturer.count({ where })
    ]);
    return { items, total };
  }

  static async options() {
    return prisma.manufacturer.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true }
    });
  }

  static async findById(id) {
    return prisma.manufacturer.findFirst({ where: { id, deletedAt: null }, select: SELECT });
  }

  static async findByCode(code) {
    return prisma.manufacturer.findFirst({ where: { code, deletedAt: null } });
  }

  static async create(data, actorId) {
    return prisma.manufacturer.create({
      data: { ...data, createdBy: actorId, updatedBy: actorId },
      select: SELECT
    });
  }

  static async update(id, data, actorId) {
    return prisma.manufacturer.update({
      where: { id },
      data: { ...data, updatedBy: actorId },
      select: SELECT
    });
  }

  static async softDelete(id, actorId) {
    return prisma.manufacturer.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actorId, isActive: false }
    });
  }

  static async countParts(id) {
    return prisma.part.count({ where: { manufacturerId: id, deletedAt: null } });
  }
}

module.exports = ManufacturerRepository;
