'use strict';
const { broker, logger } = require('@erp/shared');
const { EVENTS } = require('../constants');

async function emit(routingKey, payload, actorId) {
  try { return await broker.publish(routingKey, payload, { userId: actorId }); }
  catch (err) { logger.error('Event emit failed [%s]: %s', routingKey, err.message); return null; }
}

function base(i) {
  return {
    inspectionId: i.id, code: i.code, partId: i.partId, supplierId: i.supplierId,
    grnId: i.grnId, lotId: i.lotId,
    acceptedQty: String(i.acceptedQty), rejectedQty: String(i.rejectedQty), receivedQty: String(i.receivedQty)
  };
}

module.exports = {
  created: (i, actorId) => emit(EVENTS.INSPECTION_CREATED, base(i), actorId),
  started: (i, actorId) => emit(EVENTS.INSPECTION_STARTED, base(i), actorId),
  passed: (i, actorId) => emit(EVENTS.INSPECTION_PASSED, { ...base(i), disposition: i.disposition }, actorId),
  failed: (i, actorId) => emit(EVENTS.INSPECTION_FAILED, { ...base(i), disposition: i.disposition, severity: 'MAJOR' }, actorId),
  partial: (i, actorId) => emit(EVENTS.INSPECTION_PARTIAL, { ...base(i), disposition: i.disposition }, actorId),
  emit
};
