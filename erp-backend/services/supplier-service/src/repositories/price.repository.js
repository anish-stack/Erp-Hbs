'use strict';

const { prisma } = require('../config/prisma');

class PriceRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.supplierPartPrice.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { supplier: { select: { id: true, code: true, legalName: true, status: true } } }
      }),
      prisma.supplierPartPrice.count({ where })
    ]);
    return { items, total };
  }

  static async findById(id) {
    return prisma.supplierPartPrice.findFirst({ where: { id, deletedAt: null } });
  }

  static async create(data) {
    return prisma.supplierPartPrice.create({ data });
  }

  static async update(id, data) {
    return prisma.supplierPartPrice.update({ where: { id }, data });
  }

  static async softDelete(id) {
    return prisma.supplierPartPrice.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false }
    });
  }

  /** Replaces a supplier's whole price list in one transaction. */
  static async replaceForSupplier(supplierId, rows) {
    return prisma.$transaction(async (tx) => {
      await tx.supplierPartPrice.updateMany({
        where: { supplierId, deletedAt: null },
        data: { deletedAt: new Date(), isActive: false }
      });

      const created = await tx.supplierPartPrice.createMany({ data: rows, skipDuplicates: true });
      return created.count;
    });
  }

  /**
   * All live quotes for one part, cheapest first, restricted to suppliers that
   * are currently allowed to transact.
   */
  static async quotesForPart(partId, { quantity = 1, onlyApproved = true } = {}) {
    const now = new Date();

    return prisma.supplierPartPrice.findMany({
      where: {
        partId,
        deletedAt: null,
        isActive: true,
        moq: { lte: quantity },
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
        ...(onlyApproved ? { supplier: { status: 'APPROVED', deletedAt: null } } : {})
      },
      orderBy: [{ unitPrice: 'asc' }, { leadTimeDays: 'asc' }],
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            legalName: true,
            status: true,
            overallRating: true,
            paymentTermDays: true,
            isPreferred: true
          }
        }
      }
    });
  }

  static async partIdsForSupplier(supplierId) {
    const rows = await prisma.supplierPartPrice.findMany({
      where: { supplierId, deletedAt: null, isActive: true },
      distinct: ['partId'],
      select: { partId: true }
    });
    return rows.map((row) => row.partId);
  }

  static async suppliersForPart(partId) {
    const rows = await prisma.supplierPartPrice.findMany({
      where: { partId, deletedAt: null, isActive: true },
      distinct: ['supplierId'],
      select: { supplierId: true }
    });
    return rows.map((row) => row.supplierId);
  }
}

module.exports = PriceRepository;
