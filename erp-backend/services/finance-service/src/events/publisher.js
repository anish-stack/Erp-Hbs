'use strict';
const { broker, logger } = require('@erp/shared');
const { EVENTS } = require('../constants');

async function emit(routingKey, payload, actorId) {
  try { return await broker.publish(routingKey, payload, { userId: actorId }); }
  catch (err) { logger.error('Event emit failed [%s]: %s', routingKey, err.message); return null; }
}

function baseInv(i) {
  return {
    invoiceId: i.id, code: i.code, type: i.type, partyType: i.partyType, partyId: i.partyId,
    sourceType: i.sourceType, sourceId: i.sourceId,
    grandTotal: String(i.grandTotal), amountDue: String(i.amountDue)
  };
}

module.exports = {
  invoiceCreated: (i, actorId) => emit(EVENTS.INVOICE_CREATED, baseInv(i), actorId),
  invoiceIssued: (i, actorId) => emit(EVENTS.INVOICE_ISSUED, baseInv(i), actorId),
  invoicePaid: (i, actorId) => emit(EVENTS.INVOICE_PAID, baseInv(i), actorId),
  invoiceCancelled: (i, reason, actorId) => emit(EVENTS.INVOICE_CANCELLED, { ...baseInv(i), reason }, actorId),
  invoiceOverdue: (i) => emit(EVENTS.INVOICE_OVERDUE, { ...baseInv(i), severity: 'WARNING' }),
  paymentRecorded: (p, actorId) => emit(EVENTS.PAYMENT_RECORDED, {
    paymentId: p.id, code: p.code, direction: p.direction, partyId: p.partyId,
    amount: String(p.amount), method: p.method
  }, actorId),
  emit
};
