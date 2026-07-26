'use strict';
const { broker, logger } = require('@erp/shared');
const { EVENTS } = require('../constants');

async function emit(routingKey, payload, actorId) {
  try { return await broker.publish(routingKey, payload, { userId: actorId }); }
  catch (err) { logger.error('Event emit failed [%s]: %s', routingKey, err.message); return null; }
}

module.exports = {
  quotationCreated: (q, actorId) => emit(EVENTS.QUOTATION_CREATED, { quotationId: q.id, code: q.code, customerId: q.customerId, grandTotal: String(q.grandTotal) }, actorId),
  quotationSent: (q, actorId) => emit(EVENTS.QUOTATION_SENT, { quotationId: q.id, code: q.code, customerId: q.customerId }, actorId),
  quotationAccepted: (q, actorId) => emit(EVENTS.QUOTATION_ACCEPTED, { quotationId: q.id, code: q.code, customerId: q.customerId }, actorId),
  quotationConverted: (q, orderId, actorId) => emit(EVENTS.QUOTATION_CONVERTED, { quotationId: q.id, code: q.code, orderId }, actorId),

  orderCreated: (o, actorId) => emit(EVENTS.ORDER_CREATED, { orderId: o.id, code: o.code, customerId: o.customerId, grandTotal: String(o.grandTotal) }, actorId),
  orderConfirmed: (o, actorId) => emit(EVENTS.ORDER_CONFIRMED, { orderId: o.id, code: o.code, customerId: o.customerId, warehouseId: o.warehouseId, grandTotal: String(o.grandTotal) }, actorId),
  orderCancelled: (o, reason, actorId) => emit(EVENTS.ORDER_CANCELLED, { orderId: o.id, salesOrderId: o.id, code: o.code, reason, severity: 'WARNING' }, actorId),
  orderFulfilled: (o, actorId) => emit(EVENTS.ORDER_FULFILLED, { orderId: o.id, code: o.code, customerId: o.customerId }, actorId),
  orderPartial: (o, actorId) => emit(EVENTS.ORDER_PARTIAL, { orderId: o.id, code: o.code }, actorId),
  orderClosed: (o, actorId) => emit(EVENTS.ORDER_CLOSED, { orderId: o.id, code: o.code }, actorId),
  reservationShortfall: (o, shortfalls, actorId) => emit(EVENTS.RESERVATION_SHORTFALL, { orderId: o.id, code: o.code, shortfalls, severity: 'WARNING' }, actorId),
  emit
};
