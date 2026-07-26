'use strict';

const { prisma } = require('../config/prisma');

const LIST_INCLUDE = {
  manufacturer: { select: { id: true, code: true, name: true } },
  category: { select: { id: true, code: true, name: true, path: true } },
  uom: { select: { id: true, code: true, name: true } },
  taxRate: { select: { id: true, code: true, ratePercent: true, hsnCode: true } },
  currency: { select: { id: true, code: true, symbol: true } }
};

const DETAIL_INCLUDE = {
  ...LIST_INCLUDE,
  alternatesFrom: {
    include: {
      alternate: {
        select: { id: true, partNumber: true, description: true, lifecycle: true }
      }
    }
  }
};

class PartRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.part.findMany({ where, skip, take, orderBy, include: LIST_INCLUDE }),
      prisma.part.count({ where })
    ]);
    return { items, total };
  }

  static async findById(id) {
    return prisma.part.findFirst({ where: { id, deletedAt: null }, include: DETAIL_INCLUDE });
  }

  static async findByMpn(manufacturerId, normalizedNumber) {
    return prisma.part.findFirst({
      where: { manufacturerId, normalizedNumber, deletedAt: null }
    });
  }

  /** Tolerant lookup: exact normalised hit first, then prefix matches. */
  static async search(variants, { limit = 25, categoryPath = null } = {}) {
    const scope = {
      deletedAt: null,
      isActive: true,
      ...(categoryPath
        ? { category: { OR: [{ path: categoryPath }, { path: { startsWith: `${categoryPath}/` } }] } }
        : {})
    };

    const exact = await prisma.part.findMany({
      where: { ...scope, normalizedNumber: { in: variants } },
      include: LIST_INCLUDE,
      take: limit
    });

    if (exact.length >= limit) return { matches: exact, matchType: 'EXACT' };

    const partial = await prisma.part.findMany({
      where: {
        ...scope,
        normalizedNumber: { startsWith: variants[0] },
        NOT: { id: { in: exact.map((part) => part.id) } }
      },
      include: LIST_INCLUDE,
      take: limit - exact.length
    });

    if (exact.length + partial.length >= limit || partial.length) {
      return { matches: [...exact, ...partial], matchType: exact.length ? 'MIXED' : 'PARTIAL' };
    }

    const fuzzy = await prisma.part.findMany({
      where: {
        ...scope,
        OR: [
          { normalizedNumber: { contains: variants[0] } },
          { description: { contains: variants[0] } }
        ],
        NOT: { id: { in: exact.map((part) => part.id) } }
      },
      include: LIST_INCLUDE,
      take: limit - exact.length
    });

    return {
      matches: [...exact, ...fuzzy],
      matchType: exact.length ? 'MIXED' : fuzzy.length ? 'FUZZY' : 'NONE'
    };
  }

  static async create(data, actorId) {
    return prisma.part.create({
      data: { ...data, createdBy: actorId, updatedBy: actorId },
      include: DETAIL_INCLUDE
    });
  }

  static async update(id, data, actorId) {
    return prisma.part.update({
      where: { id },
      data: { ...data, updatedBy: actorId },
      include: DETAIL_INCLUDE
    });
  }

  static async softDelete(id, actorId) {
    return prisma.part.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actorId, isActive: false }
    });
  }

  static async addAlternate(data) {
    return prisma.partAlternate.create({ data });
  }

  static async removeAlternate(partId, alternateId) {
    return prisma.partAlternate.deleteMany({ where: { partId, alternateId } });
  }

  static async stats() {
    const [byLifecycle, byCategory, totals] = await prisma.$transaction([
      prisma.part.groupBy({ by: ['lifecycle'], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.part.groupBy({
        by: ['categoryId'],
        where: { deletedAt: null },
        _count: { _all: true },
        orderBy: { _count: { categoryId: 'desc' } },
        take: 10
      }),
      prisma.part.aggregate({ where: { deletedAt: null }, _count: { _all: true } })
    ]);
    return { byLifecycle, byCategory, totals };
  }

  static get LIST_INCLUDE() {
    return LIST_INCLUDE;
  }
}

module.exports = PartRepository;
