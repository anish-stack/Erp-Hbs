'use strict';

const { prisma } = require('../config/prisma');

class LotRepository {
  static client(tx) {
    return tx || prisma;
  }

  static async create(data, tx) {
    return LotRepository.client(tx).stockLot.create({ data });
  }

  static async findById(id) {
    return prisma.stockLot.findUnique({ where: { id } });
  }

  /** Open lots of a stock item ordered oldest-first for FIFO consumption. */
  static async openLotsFifo(stockItemId, tx) {
    return LotRepository.client(tx).stockLot.findMany({
      where: { stockItemId, status: 'AVAILABLE', remainingQty: { gt: 0 } },
      orderBy: { receivedAt: 'asc' }
    });
  }

  static async consume(id, remainingQty, status, tx) {
    return LotRepository.client(tx).stockLot.update({
      where: { id },
      data: { remainingQty, status }
    });
  }

  static async list({ where, skip, take }) {
    const [items, total] = await prisma.$transaction([
      prisma.stockLot.findMany({ where, skip, take, orderBy: { receivedAt: 'desc' } }),
      prisma.stockLot.count({ where })
    ]);
    return { items, total };
  }

  static async expiringBefore(date) {
    return prisma.stockLot.findMany({
      where: { status: 'AVAILABLE', remainingQty: { gt: 0 }, expiryDate: { not: null, lte: date } },
      orderBy: { expiryDate: 'asc' },
      take: 500
    });
  }
}

module.exports = LotRepository;
