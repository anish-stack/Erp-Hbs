'use strict';

const { prisma } = require('../config/prisma');

const LIST_SELECT = {
  id: true,
  code: true,
  legalName: true,
  tradeName: true,
  type: true,
  status: true,
  gstin: true,
  email: true,
  phone: true,
  currencyCode: true,
  paymentTermDays: true,
  creditLimit: true,
  isPreferred: true,
  riskLevel: true,
  overallRating: true,
  lastEvaluatedAt: true,
  createdAt: true,
  _count: { select: { prices: true, documents: true, contacts: true } }
};

const DETAIL_INCLUDE = {
  addresses: { where: { deletedAt: null } },
  contacts: { where: { deletedAt: null }, orderBy: { isPrimary: 'desc' } },
  bankAccounts: { where: { deletedAt: null } },
  documents: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
  ratings: { orderBy: { periodEnd: 'desc' }, take: 5 },
  statusLogs: { orderBy: { createdAt: 'desc' }, take: 10 }
};

class SupplierRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.supplier.findMany({ where, skip, take, orderBy, select: LIST_SELECT }),
      prisma.supplier.count({ where })
    ]);
    return { items, total };
  }

  static async findById(id, { detailed = false } = {}) {
    return prisma.supplier.findFirst({
      where: { id, deletedAt: null },
      ...(detailed ? { include: DETAIL_INCLUDE } : {})
    });
  }

  static async findByCode(code) {
    return prisma.supplier.findFirst({ where: { code, deletedAt: null } });
  }

  static async findByGstin(gstin) {
    return prisma.supplier.findFirst({ where: { gstin, deletedAt: null } });
  }

  static async options(status = 'APPROVED') {
    return prisma.supplier.findMany({
      where: { deletedAt: null, status },
      orderBy: { legalName: 'asc' },
      select: { id: true, code: true, legalName: true, tradeName: true, currencyCode: true }
    });
  }

  static async create(data, actorId) {
    return prisma.supplier.create({
      data: { ...data, createdBy: actorId, updatedBy: actorId },
      include: DETAIL_INCLUDE
    });
  }

  static async update(id, data, actorId) {
    return prisma.supplier.update({
      where: { id },
      data: { ...data, updatedBy: actorId },
      include: DETAIL_INCLUDE
    });
  }

  static async softDelete(id, actorId) {
    return prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actorId, status: 'INACTIVE' }
    });
  }

  static async logStatus(data) {
    return prisma.supplierStatusLog.create({ data });
  }

  static async documentTypesOf(supplierId) {
    const rows = await prisma.supplierDocument.findMany({
      where: { supplierId, deletedAt: null },
      select: { type: true, expiresOn: true, isVerified: true }
    });
    return rows;
  }

  static async stats() {
    const [byStatus, byType, byRisk, totals] = await prisma.$transaction([
      prisma.supplier.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.supplier.groupBy({ by: ['type'], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.supplier.groupBy({ by: ['riskLevel'], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.supplier.aggregate({
        where: { deletedAt: null },
        _count: { _all: true },
        _avg: { overallRating: true }
      })
    ]);
    return { byStatus, byType, byRisk, totals };
  }

  static get LIST_SELECT() {
    return LIST_SELECT;
  }
}

module.exports = SupplierRepository;
