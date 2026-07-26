'use strict';

const { prisma } = require('../config/prisma');

class ReservationRepository {
  static async create(data) {
    return prisma.stockReservation.create({ data });
  }

  static async findById(id) {
    return prisma.stockReservation.findUnique({ where: { id } });
  }

  static async update(id, data) {
    return prisma.stockReservation.update({ where: { id }, data });
  }

  static async paginate({ where, skip, take }) {
    const [items, total] = await prisma.$transaction([
      prisma.stockReservation.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.stockReservation.count({ where })
    ]);
    return { items, total };
  }

  static async openForRef(refType, refId) {
    return prisma.stockReservation.findMany({
      where: { refType, refId, status: { in: ['ACTIVE', 'PARTIALLY_FULFILLED'] } }
    });
  }

  static async expiredActive(now) {
    return prisma.stockReservation.findMany({
      where: { status: { in: ['ACTIVE', 'PARTIALLY_FULFILLED'] }, expiresAt: { not: null, lte: now } },
      take: 500
    });
  }
}

module.exports = ReservationRepository;
