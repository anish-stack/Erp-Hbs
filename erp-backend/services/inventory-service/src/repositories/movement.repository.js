'use strict';

const { prisma } = require('../config/prisma');

class MovementRepository {
  static client(tx) {
    return tx || prisma;
  }

  static async create(data, tx) {
    return MovementRepository.client(tx).stockMovement.create({ data });
  }

  static async paginate({ where, skip, take }) {
    const [items, total] = await prisma.$transaction([
      prisma.stockMovement.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.stockMovement.count({ where })
    ]);
    return { items, total };
  }

  static async existsForRef(refType, refId, type) {
    const found = await prisma.stockMovement.findFirst({
      where: { refType, refId, ...(type ? { type } : {}) },
      select: { id: true }
    });
    return Boolean(found);
  }
}

module.exports = MovementRepository;
