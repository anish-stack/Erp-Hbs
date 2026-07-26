'use strict';

const { ApiError, utils, cache } = require('@erp/shared');
const { prisma } = require('../config/prisma');
const StockRepository = require('../repositories/stock.repository');
const LotRepository = require('../repositories/lot.repository');
const MovementRepository = require('../repositories/movement.repository');
const MasterClient = require('../clients/master.client');
const publisher = require('../events/publisher');
const valuation = require('./valuation.service');
const { postMovement } = require('./movement.service');
const { MOVEMENT_TYPE, LOT_STATUS, REF_TYPE, CACHE } = require('../constants');
const config = require('../config');

function decimal(v) {
  return v === null || v === undefined ? null : String(v);
}

function shape(item) {
  if (!item) return null;
  return {
    id: item.id,
    partId: item.partId,
    partCode: item.partCode,
    partName: item.partName,
    warehouseId: item.warehouseId,
    binLocation: item.binLocation,
    uom: item.uom,
    onHand: decimal(item.onHand),
    reserved: decimal(item.reserved),
    available: decimal(item.available),
    inTransit: decimal(item.inTransit),
    quarantined: decimal(item.quarantined),
    damaged: decimal(item.damaged),
    avgCost: decimal(item.avgCost),
    totalValue: decimal(item.totalValue),
    currencyCode: item.currencyCode,
    minLevel: decimal(item.minLevel),
    reorderPoint: decimal(item.reorderPoint),
    reorderQty: decimal(item.reorderQty),
    maxLevel: decimal(item.maxLevel),
    belowReorder: Number(item.reorderPoint) > 0 && Number(item.available) <= Number(item.reorderPoint),
    isActive: item.isActive,
    lastMovementAt: item.lastMovementAt,
    lastCountedAt: item.lastCountedAt,
    lots: item.lots
      ? item.lots.map((lot) => ({
          id: lot.id,
          lotNumber: lot.lotNumber,
          dateCode: lot.dateCode,
          mslLevel: lot.mslLevel,
          remainingQty: decimal(lot.remainingQty),
          unitCost: decimal(lot.unitCost),
          status: lot.status,
          grnCode: lot.grnCode,
          expiryDate: lot.expiryDate,
          receivedAt: lot.receivedAt
        }))
      : undefined,
    recentMovements: item.movements
      ? item.movements.map((m) => ({
          id: m.id,
          type: m.type,
          quantity: decimal(m.quantity),
          balanceAfter: decimal(m.balanceAfter),
          refType: m.refType,
          refCode: m.refCode,
          reason: m.reason,
          createdAt: m.createdAt
        }))
      : undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

class StockService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['available', 'onHand', 'totalValue', 'lastMovementAt', 'createdAt'],
      defaultSortField: 'lastMovementAt'
    });

    const where = {
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.partId ? { partId: query.partId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.hasStock ? { onHand: { gt: 0 } } : {}),
      ...(query.search
        ? { OR: [{ partCode: { contains: query.search } }, { partName: { contains: query.search } }] }
        : {})
    };

    const { items, total } = await StockRepository.paginate({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy
    });

    let rows = items.map((row) => ({
      ...row,
      belowReorder: Number(row.reorderPoint) > 0 && Number(row.available) <= Number(row.reorderPoint)
    }));

    if (query.belowReorder) rows = rows.filter((row) => row.belowReorder);

    return {
      items: rows.map((row) => ({
        ...row,
        onHand: decimal(row.onHand),
        reserved: decimal(row.reserved),
        available: decimal(row.available),
        avgCost: decimal(row.avgCost),
        totalValue: decimal(row.totalValue),
        reorderPoint: decimal(row.reorderPoint),
        reorderQty: decimal(row.reorderQty)
      })),
      total,
      page: pagination.page,
      limit: pagination.limit
    };
  }

  static async getById(id) {
    const item = await StockRepository.findById(id, { detailed: true });
    if (!item) throw ApiError.notFound('Stock position not found');
    return shape(item);
  }

  static async byPart(partId) {
    const rows = await StockRepository.byPart(partId);
    const totals = rows.reduce(
      (acc, r) => {
        acc.onHand += Number(r.onHand);
        acc.reserved += Number(r.reserved);
        acc.available += Number(r.available);
        acc.totalValue += Number(r.totalValue);
        return acc;
      },
      { onHand: 0, reserved: 0, available: 0, totalValue: 0 }
    );
    return {
      partId,
      warehouses: rows.map(shape),
      totals: {
        onHand: decimal(valuation.qty(totals.onHand)),
        reserved: decimal(valuation.qty(totals.reserved)),
        available: decimal(valuation.qty(totals.available)),
        totalValue: decimal(valuation.money(totals.totalValue))
      }
    };
  }

  /** Availability probe used by Sales before it confirms an order. */
  static async availability(partId, warehouseId, requiredQty = 0) {
    const where = { partId, ...(warehouseId ? { warehouseId } : {}) };
    const rows = await prisma.stockItem.findMany({
      where,
      select: { warehouseId: true, available: true, onHand: true, reserved: true }
    });
    const available = rows.reduce((sum, r) => sum + Number(r.available), 0);
    return {
      partId,
      warehouseId: warehouseId || null,
      available: decimal(valuation.qty(available)),
      required: decimal(valuation.qty(requiredQty)),
      canFulfil: available >= Number(requiredQty),
      byWarehouse: rows.map((r) => ({
        warehouseId: r.warehouseId,
        available: decimal(r.available),
        onHand: decimal(r.onHand),
        reserved: decimal(r.reserved)
      }))
    };
  }

  static async resolveWarehouse(warehouseId) {
    const id = warehouseId || config.defaultWarehouseId;
    if (!id) throw ApiError.badRequest('warehouseId is required (no DEFAULT_WAREHOUSE_ID configured)');
    return id;
  }

  /** Finds or creates a stock position, enriching with master part metadata. */
  static async ensurePosition(tx, { partId, warehouseId, binLocation = 'DEFAULT', part = null, user = null }) {
    let item = await StockRepository.findPosition(partId, warehouseId, binLocation, tx);
    if (item) return item;

    return StockRepository.create(
      {
        partId,
        partCode: part ? part.code || part.partNumber || null : null,
        partName: part ? part.name || null : null,
        uom: part ? part.uom || part.unit || 'PCS' : 'PCS',
        warehouseId,
        binLocation,
        createdBy: user ? user.id : null
      },
      tx
    );
  }

  /** Canonical stock-in. Creates a lot and a RECEIPT movement atomically. */
  static async receipt(payload, user) {
    const warehouseId = await StockService.resolveWarehouse(payload.warehouseId);

    if (payload.refType === REF_TYPE.GRN && payload.refId) {
      const already = await MovementRepository.existsForRef(REF_TYPE.GRN, payload.refId, MOVEMENT_TYPE.RECEIPT);
      if (already) throw ApiError.conflict('This GRN has already been received into stock', { refId: payload.refId });
    }

    const { found, missing } = await MasterClient.verifyParts([payload.partId], user);
    if (missing.length) throw ApiError.badRequest('Part not found in master data', { partId: payload.partId });
    const part = found[0];

    const result = await prisma.$transaction(async (tx) => {
      const item = await StockService.ensurePosition(tx, {
        partId: payload.partId,
        warehouseId,
        binLocation: payload.binLocation || 'DEFAULT',
        part,
        user
      });

      const lot = await LotRepository.create(
        {
          stockItemId: item.id,
          partId: payload.partId,
          warehouseId,
          lotNumber: payload.lotNumber || `LOT-${Date.now()}`,
          dateCode: payload.dateCode || null,
          mslLevel: payload.mslLevel || null,
          serialFrom: payload.serialFrom || null,
          serialTo: payload.serialTo || null,
          receivedQty: valuation.qty(payload.quantity),
          remainingQty: valuation.qty(payload.quantity),
          unitCost: valuation.cost(payload.unitCost || 0),
          currencyCode: payload.currencyCode || item.currencyCode,
          status: payload.quarantine ? LOT_STATUS.QUARANTINE : LOT_STATUS.AVAILABLE,
          supplierId: payload.supplierId || null,
          grnId: payload.refType === REF_TYPE.GRN ? payload.refId : null,
          grnCode: payload.refCode || null,
          mfgDate: payload.mfgDate ? new Date(payload.mfgDate) : null,
          expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : null,
          createdBy: user.id
        },
        tx
      );

      const posted = await postMovement(tx, item, {
        type: MOVEMENT_TYPE.RECEIPT,
        quantity: payload.quantity,
        unitCost: payload.unitCost || 0,
        lotId: lot.id,
        refType: payload.refType || REF_TYPE.MANUAL,
        refId: payload.refId || null,
        refCode: payload.refCode || null,
        reason: payload.reason || 'Stock receipt',
        actorId: user.id
      });

      return { item: posted.item, movement: posted.movement, lot };
    });

    await cache.del(CACHE.stock(result.item.id), CACHE.lowStock(), CACHE.valuation());
    await publisher.receiptPosted(result.item, result.movement, user.id);
    await StockService.checkReorder(result.item);

    return { position: shape(result.item), movementId: result.movement.id, lotId: result.lot.id };
  }

  /** Canonical stock-out. Consumes lots FIFO and writes an ISSUE movement. */
  static async issue(payload, user) {
    const warehouseId = await StockService.resolveWarehouse(payload.warehouseId);
    const qtyOut = valuation.qty(payload.quantity);

    const result = await prisma.$transaction(async (tx) => {
      const item = await StockRepository.findPosition(payload.partId, warehouseId, payload.binLocation || 'DEFAULT', tx);
      if (!item) throw ApiError.notFound('No stock position for this part and warehouse');

      if (!payload.allowNegative && Number(item.available) < qtyOut) {
        throw ApiError.conflict('Insufficient available stock', {
          available: String(item.available),
          requested: String(qtyOut)
        });
      }

      await StockService.consumeLots(tx, item.id, qtyOut);

      const posted = await postMovement(tx, item, {
        type: MOVEMENT_TYPE.ISSUE,
        quantity: qtyOut,
        unitCost: item.avgCost,
        refType: payload.refType || REF_TYPE.MANUAL,
        refId: payload.refId || null,
        refCode: payload.refCode || null,
        reason: payload.reason || 'Stock issue',
        actorId: user.id
      });

      return posted;
    });

    await cache.del(CACHE.stock(result.item.id), CACHE.lowStock(), CACHE.valuation());
    await publisher.issuePosted(result.item, result.movement, user.id);
    await StockService.checkReorder(result.item);

    return { position: shape(result.item), movementId: result.movement.id };
  }

  /** Inter-warehouse transfer = ISSUE from source + RECEIPT into destination. */
  static async transfer(payload, user) {
    const fromWh = await StockService.resolveWarehouse(payload.fromWarehouseId);
    const toWh = payload.toWarehouseId;
    if (!toWh) throw ApiError.badRequest('toWarehouseId is required');
    if (fromWh === toWh && (payload.fromBin || 'DEFAULT') === (payload.toBin || 'DEFAULT')) {
      throw ApiError.badRequest('Source and destination are identical');
    }

    const qtyMove = valuation.qty(payload.quantity);

    const result = await prisma.$transaction(async (tx) => {
      const source = await StockRepository.findPosition(payload.partId, fromWh, payload.fromBin || 'DEFAULT', tx);
      if (!source) throw ApiError.notFound('No stock at the source location');
      if (Number(source.available) < qtyMove) {
        throw ApiError.conflict('Insufficient available stock to transfer', {
          available: String(source.available)
        });
      }

      await StockService.consumeLots(tx, source.id, qtyMove);
      const out = await postMovement(tx, source, {
        type: MOVEMENT_TYPE.TRANSFER_OUT,
        quantity: qtyMove,
        unitCost: source.avgCost,
        refType: REF_TYPE.TRANSFER,
        refCode: payload.refCode || null,
        reason: payload.reason || `Transfer to ${toWh}`,
        actorId: user.id
      });

      const dest = await StockService.ensurePosition(tx, {
        partId: payload.partId,
        warehouseId: toWh,
        binLocation: payload.toBin || 'DEFAULT',
        part: { code: source.partCode, name: source.partName, uom: source.uom },
        user
      });

      await LotRepository.create(
        {
          stockItemId: dest.id,
          partId: payload.partId,
          warehouseId: toWh,
          lotNumber: `TRF-${Date.now()}`,
          receivedQty: qtyMove,
          remainingQty: qtyMove,
          unitCost: source.avgCost,
          currencyCode: source.currencyCode,
          status: LOT_STATUS.AVAILABLE,
          createdBy: user.id
        },
        tx
      );

      const inMove = await postMovement(tx, dest, {
        type: MOVEMENT_TYPE.TRANSFER_IN,
        quantity: qtyMove,
        unitCost: source.avgCost,
        refType: REF_TYPE.TRANSFER,
        refId: out.movement.id,
        refCode: payload.refCode || null,
        reason: payload.reason || `Transfer from ${fromWh}`,
        actorId: user.id
      });

      return { source: out.item, dest: inMove.item };
    });

    await cache.del(CACHE.stock(result.source.id), CACHE.stock(result.dest.id), CACHE.valuation());
    await StockService.checkReorder(result.source);

    return { from: shape(result.source), to: shape(result.dest) };
  }

  /** FIFO lot consumption inside a transaction. */
  static async consumeLots(tx, stockItemId, quantity) {
    let remaining = valuation.qty(quantity);
    const lots = await LotRepository.openLotsFifo(stockItemId, tx);

    for (const lot of lots) {
      if (remaining <= 0) break;
      const take = Math.min(Number(lot.remainingQty), remaining);
      const left = valuation.qty(Number(lot.remainingQty) - take);
      await LotRepository.consume(lot.id, left, left <= 0 ? LOT_STATUS.CONSUMED : LOT_STATUS.AVAILABLE, tx);
      remaining = valuation.qty(remaining - take);
    }
    // Any residual (over-issue with allowNegative) is left untracked at lot level.
    return remaining;
  }

  static async setReorderRules(id, payload, user) {
    const item = await StockRepository.findById(id);
    if (!item) throw ApiError.notFound('Stock position not found');

    const updated = await StockRepository.updateBalances(id, {
      minLevel: payload.minLevel ?? item.minLevel,
      reorderPoint: payload.reorderPoint ?? item.reorderPoint,
      reorderQty: payload.reorderQty ?? item.reorderQty,
      maxLevel: payload.maxLevel ?? item.maxLevel,
      updatedBy: user.id
    });

    await cache.del(CACHE.stock(id), CACHE.lowStock());
    return shape(updated);
  }

  static async checkReorder(item) {
    if (Number(item.reorderPoint) > 0 && Number(item.available) <= Number(item.reorderPoint)) {
      const severity = Number(item.available) <= 0 ? 'CRITICAL' : 'WARNING';
      await publisher.lowStock(item, severity);
    }
  }

  static async lowStock() {
    const rows = await StockRepository.lowStock();
    return rows.map((r) => ({
      id: r.id,
      partId: r.partId,
      partCode: r.partCode,
      partName: r.partName,
      warehouseId: r.warehouseId,
      available: decimal(r.available),
      reorderPoint: decimal(r.reorderPoint),
      reorderQty: decimal(r.reorderQty)
    }));
  }

  static async stats() {
    const raw = await StockRepository.stats();
    return {
      positions: raw.positions,
      totals: {
        onHand: decimal(raw.totals._sum.onHand || 0),
        reserved: decimal(raw.totals._sum.reserved || 0),
        available: decimal(raw.totals._sum.available || 0),
        totalValue: decimal(raw.totals._sum.totalValue || 0)
      },
      byWarehouse: raw.byWarehouse.map((w) => ({
        warehouseId: w.warehouseId,
        positions: w._count._all,
        onHand: decimal(w._sum.onHand || 0),
        totalValue: decimal(w._sum.totalValue || 0)
      }))
    };
  }

  static shape = shape;
}

module.exports = StockService;
