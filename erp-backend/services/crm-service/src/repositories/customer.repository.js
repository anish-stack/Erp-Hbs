'use strict';

const { prisma } = require('../config/prisma');

const LIST_SELECT = {
  id: true, code: true, legalName: true, tradeName: true, type: true, status: true,
  segment: true, gstin: true, email: true, phone: true, currencyCode: true,
  paymentTermDays: true, creditLimit: true, creditUsed: true, ownerId: true, createdAt: true
};

const DETAIL_INCLUDE = {
  addresses: { where: { deletedAt: null } },
  contacts: { where: { deletedAt: null }, orderBy: { isPrimary: 'desc' } },
  creditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
  activities: { orderBy: { createdAt: 'desc' }, take: 20 }
};

class CustomerRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.customer.findMany({ where, skip, take, orderBy, select: LIST_SELECT }),
      prisma.customer.count({ where })
    ]);
    return { items, total };
  }

  static async findById(id, { detailed = false } = {}) {
    return prisma.customer.findFirst({
      where: { id, deletedAt: null },
      ...(detailed ? { include: DETAIL_INCLUDE } : {})
    });
  }

  static async findByCode(code) {
    return prisma.customer.findFirst({ where: { code, deletedAt: null } });
  }

  static async findByGstin(gstin) {
    return prisma.customer.findFirst({ where: { gstin, deletedAt: null } });
  }

  static async options() {
    return prisma.customer.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      orderBy: { legalName: 'asc' },
      select: { id: true, code: true, legalName: true, currencyCode: true, creditLimit: true, creditUsed: true }
    });
  }

  static async create(data, actorId) {
    return prisma.customer.create({ data: { ...data, createdBy: actorId, updatedBy: actorId }, include: DETAIL_INCLUDE });
  }

  static async update(id, data, actorId) {
    return prisma.customer.update({ where: { id }, data: { ...data, updatedBy: actorId }, include: DETAIL_INCLUDE });
  }

  static async softDelete(id, actorId) {
    return prisma.customer.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actorId, status: 'INACTIVE' } });
  }

  /** Atomic credit adjustment: locks the row so concurrent sales cannot both pass a limit check. */
  static async adjustCredit(id, delta) {
    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw`
        SELECT id, creditLimit, creditUsed, creditHoldOverride
        FROM customers WHERE id = ${id} FOR UPDATE
      `;
      if (!rows.length) return null;

      const customer = rows[0];
      const newUsed = Number(customer.creditUsed) + delta;

      await tx.customer.update({ where: { id }, data: { creditUsed: newUsed } });

      return {
        creditLimit: Number(customer.creditLimit),
        creditUsed: newUsed,
        available: Number(customer.creditLimit) - newUsed,
        breached: !customer.creditHoldOverride && newUsed > Number(customer.creditLimit)
      };
    });
  }

  static async stats() {
    const [byStatus, bySegment, totals] = await prisma.$transaction([
      prisma.customer.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.customer.groupBy({ by: ['segment'], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.customer.aggregate({
        where: { deletedAt: null },
        _count: { _all: true },
        _sum: { creditLimit: true, creditUsed: true }
      })
    ]);
    return { byStatus, bySegment, totals };
  }

  static get LIST_SELECT() { return LIST_SELECT; }
}

module.exports = CustomerRepository;
