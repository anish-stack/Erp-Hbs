'use strict';

const { broker, logger } = require('@erp/shared');
const { EVENTS } = require('../constants');

async function emit(routingKey, payload, actorId) {
  try {
    return await broker.publish(routingKey, payload, { userId: actorId });
  } catch (err) {
    logger.error('Event emit failed [%s]: %s', routingKey, err.message);
    return null;
  }
}

function baseItem(item) {
  return {
    stockItemId: item.id,
    partId: item.partId,
    partCode: item.partCode,
    warehouseId: item.warehouseId,
    onHand: String(item.onHand),
    available: String(item.available)
  };
}

module.exports = {
  stockUpdated: (item, actorId) => emit(EVENTS.STOCK_UPDATED, baseItem(item), actorId),

  receiptPosted: (item, movement, actorId) =>
    emit(
      EVENTS.RECEIPT_POSTED,
      { ...baseItem(item), movementId: movement.id, quantity: String(movement.quantity), refType: movement.refType, refId: movement.refId },
      actorId
    ),

  issuePosted: (item, movement, actorId) =>
    emit(
      EVENTS.ISSUE_POSTED,
      { ...baseItem(item), movementId: movement.id, quantity: String(movement.quantity), refType: movement.refType, refId: movement.refId },
      actorId
    ),

  lowStock: (item, severity) =>
    emit(severity === 'CRITICAL' ? EVENTS.OUT_OF_STOCK : EVENTS.LOW_STOCK, {
      ...baseItem(item),
      reorderPoint: String(item.reorderPoint),
      reorderQty: String(item.reorderQty),
      severity
    }),

  reserved: (reservation, actorId) =>
    emit(
      EVENTS.RESERVED,
      {
        reservationId: reservation.id,
        partId: reservation.partId,
        warehouseId: reservation.warehouseId,
        quantity: String(reservation.quantity),
        refType: reservation.refType,
        refId: reservation.refId
      },
      actorId
    ),

  reservationReleased: (reservation, actorId) =>
    emit(
      EVENTS.RESERVATION_RELEASED,
      { reservationId: reservation.id, refType: reservation.refType, refId: reservation.refId, status: reservation.status },
      actorId
    ),

  reservationFailed: (refType, refId, reason, actorId) =>
    emit(EVENTS.RESERVATION_FAILED, { refType, refId, reason, severity: 'WARNING' }, actorId),

  adjustmentPosted: (adjustment, actorId) =>
    emit(
      EVENTS.ADJUSTMENT_POSTED,
      { adjustmentId: adjustment.id, code: adjustment.code, warehouseId: adjustment.warehouseId, type: adjustment.type },
      actorId
    ),

  lotExpiring: (lots) =>
    emit(EVENTS.LOT_EXPIRING, {
      count: lots.length,
      severity: 'WARNING',
      lots: lots.map((l) => ({ lotId: l.id, partId: l.partId, lotNumber: l.lotNumber, expiryDate: l.expiryDate, remainingQty: String(l.remainingQty) }))
    }),

  emit
};
