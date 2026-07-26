'use strict';

const { prisma } = require('../config/prisma');
const StockRepository = require('../repositories/stock.repository');
const MovementRepository = require('../repositories/movement.repository');
const valuation = require('./valuation.service');
const { MOVEMENT_DIRECTION } = require('../constants');

/**
 * The ledger engine. Every quantity change flows through postMovement so the
 * running balance on StockItem and the append-only StockMovement ledger can
 * never drift apart. Must be called inside a Prisma transaction (tx).
 */
async function postMovement(tx, item, params) {
  const {
    type,
    quantity,
    unitCost = null,
    lotId = null,
    refType = null,
    refId = null,
    refCode = null,
    reason = null,
    actorId = null
  } = params;

  const direction = MOVEMENT_DIRECTION[type];
  if (direction === undefined) throw new Error(`Unknown movement type: ${type}`);

  const magnitude = valuation.qty(quantity);
  const signedQty = valuation.qty(direction * magnitude);

  const balanceBefore = valuation.qty(item.onHand);
  const balanceAfter = valuation.qty(balanceBefore + signedQty);

  let avgCost = valuation.cost(item.avgCost);
  const inbound = direction > 0;

  if (inbound && unitCost !== null) {
    avgCost = valuation.movingAverage({
      onHand: balanceBefore,
      avgCost,
      inQty: magnitude,
      inCost: unitCost
    });
  }

  const lineCost = valuation.cost(unitCost !== null ? unitCost : avgCost);
  const lineValue = valuation.money(magnitude * lineCost);
  const totalValue = valuation.money(balanceAfter * avgCost);

  const movement = await MovementRepository.create(
    {
      stockItemId: item.id,
      partId: item.partId,
      warehouseId: item.warehouseId,
      lotId,
      type,
      direction,
      quantity: magnitude,
      unitCost: lineCost,
      value: lineValue,
      balanceBefore,
      balanceAfter,
      refType,
      refId,
      refCode,
      reason,
      actorId
    },
    tx
  );

  const updated = await StockRepository.updateBalances(
    item.id,
    {
      onHand: balanceAfter,
      available: valuation.qty(balanceAfter - Number(item.reserved)),
      avgCost,
      totalValue,
      lastMovementAt: new Date(),
      updatedBy: actorId || item.updatedBy
    },
    tx
  );

  return { movement, item: updated };
}

/** Convenience wrapper that opens its own transaction. */
async function postStandalone(itemId, params) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.stockItem.findUnique({ where: { id: itemId } });
    return postMovement(tx, item, params);
  });
}

module.exports = { postMovement, postStandalone };
