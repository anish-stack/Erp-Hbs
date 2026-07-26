'use strict';
const { broker, logger } = require('@erp/shared');
const { EVENTS } = require('../constants');

async function emit(routingKey, payload, actorId) {
  try { return await broker.publish(routingKey, payload, { userId: actorId }); }
  catch (err) { logger.error('Event emit failed [%s]: %s', routingKey, err.message); return null; }
}

function base(s) {
  return { shipmentId: s.id, code: s.code, orderId: s.orderId, orderCode: s.orderCode, warehouseId: s.warehouseId };
}

module.exports = {
  created: (s, actorId) => emit(EVENTS.SHIPMENT_CREATED, base(s), actorId),
  picking: (s, actorId) => emit(EVENTS.SHIPMENT_PICKING, base(s), actorId),
  picked: (s, actorId) => emit(EVENTS.SHIPMENT_PICKED, base(s), actorId),
  packed: (s, actorId) => emit(EVENTS.SHIPMENT_PACKED, { ...base(s), packageCount: s.packageCount }, actorId),
  /** Carries orderId + shipped lines so Sales can roll fulfilment status. */
  dispatched: (s, actorId) => emit(EVENTS.SHIPMENT_DISPATCHED, {
    ...base(s),
    salesOrderId: s.orderId,
    carrier: s.carrier,
    trackingNumber: s.trackingNumber,
    lines: (s.lines || []).map((l) => ({ partId: l.partId, quantity: String(l.pickedQty || l.quantity) }))
  }, actorId),
  delivered: (s, actorId) => emit(EVENTS.SHIPMENT_DELIVERED, base(s), actorId),
  cancelled: (s, reason, actorId) => emit(EVENTS.SHIPMENT_CANCELLED, { ...base(s), reason, severity: 'WARNING' }, actorId),
  emit
};
