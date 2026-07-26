'use strict';

const { prisma } = require('../config/prisma');

class RatingRepository {
  static async create(data) {
    return prisma.supplierRating.create({ data });
  }

  static async upsertPeriod(supplierId, periodStart, periodEnd, data) {
    return prisma.supplierRating.upsert({
      where: {
        supplierId_periodStart_periodEnd: { supplierId, periodStart, periodEnd }
      },
      update: data,
      create: { supplierId, periodStart, periodEnd, ...data }
    });
  }

  static async listForSupplier(supplierId, take = 12) {
    return prisma.supplierRating.findMany({
      where: { supplierId },
      orderBy: { periodEnd: 'desc' },
      take
    });
  }

  static async leaderboard(take = 20) {
    return prisma.supplier.findMany({
      where: { deletedAt: null, status: 'APPROVED', overallRating: { not: null } },
      orderBy: { overallRating: 'desc' },
      take,
      select: {
        id: true,
        code: true,
        legalName: true,
        overallRating: true,
        riskLevel: true,
        lastEvaluatedAt: true
      }
    });
  }

  // -------------------- Running performance counters --------------------
  static async performance(supplierId) {
    return prisma.supplierPerformance.findUnique({ where: { supplierId } });
  }

  static async bumpPerformance(supplierId, increments, lastOrderAt = null) {
    const data = {};
    for (const [field, value] of Object.entries(increments)) {
      data[field] = { increment: value };
    }
    if (lastOrderAt) data.lastOrderAt = lastOrderAt;

    const create = { supplierId, ...Object.fromEntries(Object.entries(increments)) };
    if (lastOrderAt) create.lastOrderAt = lastOrderAt;

    return prisma.supplierPerformance.upsert({
      where: { supplierId },
      update: data,
      create
    });
  }

  static async resetPerformance(supplierId) {
    return prisma.supplierPerformance.update({
      where: { supplierId },
      data: {
        ordersPlaced: 0,
        ordersOnTime: 0,
        ordersLate: 0,
        lotsReceived: 0,
        lotsAccepted: 0,
        lotsRejected: 0,
        quotesRequested: 0,
        quotesAnswered: 0
      }
    });
  }

  static async allWithActivity() {
    return prisma.supplierPerformance.findMany({
      where: { OR: [{ ordersPlaced: { gt: 0 } }, { lotsReceived: { gt: 0 } }] }
    });
  }
}

module.exports = RatingRepository;
