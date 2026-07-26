'use strict';

const { prisma } = require('../config/prisma');

const LIST_SELECT = {
  id: true,
  partId: true,
  partCode: true,
  partName: true,
  warehouseId: true,
  binLocation: true,
  uom: true,
  onHand: true,
  reserved: true,
  available: true,
  quarantined: true,
  avgCost: true,
  totalValue: true,
  currencyCode: true,
  reorderPoint: true,
  reorderQty: true,
  isActive: true,
  lastMovementAt: true
};

const DETAIL_INCLUDE = {
  lots: { where: { status: { in: ['AVAILABLE', 'QUARANTINE'] } }, orderBy: { receivedAt: 'asc' } },
  movements: { orderBy: { createdAt: 'desc' }, take: 20 }
};

class StockRepository {
  static client(tx) {
    return tx || prisma;
  }

  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.stockItem.findMany({ where, skip, take, orderBy, select: LIST_SELECT }),
      prisma.stockItem.count({ where })
    ]);
    return { items, total };
  }

  static async findById(id, { detailed = false } = {}) {
    return prisma.stockItem.findUnique({
      where: { id },
      ...(detailed ? { include: DETAIL_INCLUDE } : {})
    });
  }

  static async findPosition(partId, warehouseId, binLocation = 'DEFAULT', tx) {
    return StockRepository.client(tx).stockItem.findUnique({
      where: { position: { partId, warehouseId, binLocation } }
    });
  }

  static async byPart(partId) {
    return prisma.stockItem.findMany({
      where: { partId },
      orderBy: { warehouseId: 'asc' },
      select: LIST_SELECT
    });
  }

  static async create(data, tx) {
    return StockRepository.client(tx).stockItem.create({ data });
  }

  static async updateBalances(id, data, tx) {
    return StockRepository.client(tx).stockItem.update({ where: { id }, data });
  }

  static async lowStock() {
    return prisma.$queryRaw`
      SELECT id, partId, partCode, partName, warehouseId, available, reorderPoint, reorderQty
      FROM stock_items
      WHERE isActive = 1 AND reorderPoint > 0 AND available <= reorderPoint
      ORDER BY (available - reorderPoint) ASC
      LIMIT 500`;
  }

  static async stats() {
    const [positions, totals, byWarehouse] = await prisma.$transaction([
      prisma.stockItem.count({ where: { isActive: true } }),
      prisma.stockItem.aggregate({
        where: { isActive: true },
        _sum: { onHand: true, reserved: true, available: true, totalValue: true }
      }),
      prisma.stockItem.groupBy({
        by: ['warehouseId'],
        where: { isActive: true },
        _sum: { totalValue: true, onHand: true },
        _count: { _all: true }
      })
    ]);
    return { positions, totals, byWarehouse };
  }

  static async valuation() {
    const rows = await prisma.stockItem.aggregate({
      where: { isActive: true },
      _sum: { totalValue: true, onHand: true }
    });
    return rows;
  }

  static get LIST_SELECT() {
    return LIST_SELECT;
  }
}

module.exports = StockRepository;
