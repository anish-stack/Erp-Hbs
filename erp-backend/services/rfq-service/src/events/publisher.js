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

module.exports = {
  /** One event per invited supplier — the Supplier Service scorecard increments quotesRequested per supplierId. */
  createdForSupplier: (rfq, supplierId, actorId) =>
    emit(EVENTS.CREATED, { rfqId: rfq.id, code: rfq.code, supplierId }, actorId),

  sent: (rfq, supplierIds, actorId) =>
    emit(EVENTS.SENT, { rfqId: rfq.id, code: rfq.code, supplierIds, count: supplierIds.length }, actorId),

  /** One event for the specific supplier who just quoted — increments quotesAnswered. */
  quoted: (rfq, supplierId, actorId) =>
    emit(EVENTS.QUOTED, { rfqId: rfq.id, code: rfq.code, supplierId }, actorId),

  allQuoted: (rfq) => emit(EVENTS.ALL_QUOTED, { rfqId: rfq.id, code: rfq.code }),

  compared: (rfq, actorId) => emit(EVENTS.COMPARED, { rfqId: rfq.id, code: rfq.code }, actorId),

  awarded: (rfq, awards, actorId) =>
    emit(EVENTS.AWARDED, {
      rfqId: rfq.id, code: rfq.code,
      awards: awards.map((a) => ({ lineId: a.id, partId: a.partId, supplierId: a.awardedSupplierId, qty: a.awardedQty, price: a.awardedPrice ? String(a.awardedPrice) : null }))
    }, actorId),

  closed: (rfq, actorId) => emit(EVENTS.CLOSED, { rfqId: rfq.id, code: rfq.code }, actorId),

  cancelled: (rfq, reason, actorId) =>
    emit(EVENTS.CANCELLED, { rfqId: rfq.id, code: rfq.code, reason, severity: 'WARNING' }, actorId),

  deadlineMissed: (rfqs) =>
    emit(EVENTS.DEADLINE_MISSED, {
      count: rfqs.length, severity: 'WARNING',
      rfqs: rfqs.map((r) => ({ rfqId: r.id, code: r.code, requestedBy: r.requestedBy }))
    }),

  audit: (payload, actorId) => emit('audit.log', payload, actorId),

  emit
};
