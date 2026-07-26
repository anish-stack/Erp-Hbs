'use strict';
const { broker, logger } = require('@erp/shared');
const { EVENTS } = require('../constants');

async function emit(routingKey, payload, actorId) {
  try { return await broker.publish(routingKey, payload, { userId: actorId }); }
  catch (err) { logger.error('Event emit failed [%s]: %s', routingKey, err.message); return null; }
}

module.exports = {
  poCreated: (po, actorId) => emit(EVENTS.PO_CREATED, { poId: po.id, code: po.code, supplierId: po.supplierId, grandTotal: String(po.grandTotal) }, actorId),
  poApproved: (po, actorId) => emit(EVENTS.PO_APPROVED, { poId: po.id, code: po.code, supplierId: po.supplierId }, actorId),
  poRejected: (po, reason, actorId) => emit(EVENTS.PO_REJECTED, { poId: po.id, code: po.code, reason, severity: 'WARNING' }, actorId),
  poIssued: (po, actorId) => emit(EVENTS.PO_ISSUED, { poId: po.id, code: po.code, supplierId: po.supplierId }, actorId),
  poCancelled: (po, reason, actorId) => emit(EVENTS.PO_CANCELLED, { poId: po.id, code: po.code, reason, severity: 'WARNING' }, actorId),
  poClosed: (po, actorId) => emit(EVENTS.PO_CLOSED, { poId: po.id, code: po.code }, actorId),
  poOverdue: (pos) => emit(EVENTS.PO_OVERDUE, { count: pos.length, severity: 'WARNING', pos: pos.map(p => ({ poId: p.id, code: p.code, supplierId: p.supplierId })) }),

  grnCreated: (grn, po, onTime, actorId) => emit(EVENTS.GRN_CREATED, { grnId: grn.id, code: grn.code, poId: po.id, supplierId: po.supplierId, onTime }, actorId),
  inspectionRequested: (grn, actorId) => emit(EVENTS.GRN_INSPECTION_REQUIRED, { grnId: grn.id, code: grn.code, poId: grn.poId }, actorId),
  grnCompleted: (grn, actorId) => emit(EVENTS.GRN_COMPLETED, { grnId: grn.id, code: grn.code, poId: grn.poId }, actorId),

  audit: (payload, actorId) => emit('audit.log', payload, actorId),
  emit
};
