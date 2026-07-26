'use strict';

const { utils } = require('@erp/shared');
const MovementRepository = require('../repositories/movement.repository');
const LotRepository = require('../repositories/lot.repository');

function shapeMovement(m) {
  return {
    id: m.id,
    stockItemId: m.stockItemId,
    partId: m.partId,
    warehouseId: m.warehouseId,
    lotId: m.lotId,
    type: m.type,
    direction: m.direction,
    quantity: String(m.quantity),
    unitCost: String(m.unitCost),
    value: String(m.value),
    balanceBefore: String(m.balanceBefore),
    balanceAfter: String(m.balanceAfter),
    refType: m.refType,
    refId: m.refId,
    refCode: m.refCode,
    reason: m.reason,
    actorId: m.actorId,
    createdAt: m.createdAt
  };
}

function shapeLot(l) {
  return {
    id: l.id,
    stockItemId: l.stockItemId,
    partId: l.partId,
    warehouseId: l.warehouseId,
    lotNumber: l.lotNumber,
    dateCode: l.dateCode,
    mslLevel: l.mslLevel,
    receivedQty: String(l.receivedQty),
    remainingQty: String(l.remainingQty),
    unitCost: String(l.unitCost),
    status: l.status,
    supplierId: l.supplierId,
    grnCode: l.grnCode,
    mfgDate: l.mfgDate,
    expiryDate: l.expiryDate,
    receivedAt: l.receivedAt
  };
}

class MovementQueryService {
  static async listMovements(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['createdAt'],
      defaultSortField: 'createdAt'
    });
    const where = {
      ...(query.stockItemId ? { stockItemId: query.stockItemId } : {}),
      ...(query.partId ? { partId: query.partId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.refType ? { refType: query.refType } : {}),
      ...(query.refId ? { refId: query.refId } : {}),
      ...(query.from || query.to
        ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
        : {})
    };
    const { items, total } = await MovementRepository.paginate({
      where,
      skip: pagination.skip,
      take: pagination.take
    });
    return { items: items.map(shapeMovement), total, page: pagination.page, limit: pagination.limit };
  }

  static async listLots(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['receivedAt', 'expiryDate'],
      defaultSortField: 'receivedAt'
    });
    const where = {
      ...(query.partId ? { partId: query.partId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.lotNumber ? { lotNumber: { contains: query.lotNumber } } : {})
    };
    const { items, total } = await LotRepository.list({ where, skip: pagination.skip, take: pagination.take });
    return { items: items.map(shapeLot), total, page: pagination.page, limit: pagination.limit };
  }

  static async getLot(id) {
    const lot = await LotRepository.findById(id);
    return lot ? shapeLot(lot) : null;
  }

  static shapeMovement = shapeMovement;
  static shapeLot = shapeLot;
}

module.exports = MovementQueryService;
