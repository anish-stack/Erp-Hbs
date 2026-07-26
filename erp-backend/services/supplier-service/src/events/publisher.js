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

function base(supplier) {
  return {
    supplierId: supplier.id,
    code: supplier.code,
    legalName: supplier.legalName,
    status: supplier.status
  };
}

module.exports = {
  created: (supplier, actorId) => emit(EVENTS.CREATED, base(supplier), actorId),

  updated: (supplier, changes, actorId) =>
    emit(EVENTS.UPDATED, { ...base(supplier), changes }, actorId),

  submitted: (supplier, actorId) => emit(EVENTS.SUBMITTED, base(supplier), actorId),

  approved: (supplier, actorId) =>
    emit(EVENTS.APPROVED, { ...base(supplier), approvedAt: supplier.approvedAt }, actorId),

  rejected: (supplier, reason, actorId) =>
    emit(EVENTS.REJECTED, { ...base(supplier), reason, severity: 'WARNING' }, actorId),

  blacklisted: (supplier, reason, actorId) =>
    emit(EVENTS.BLACKLISTED, { ...base(supplier), reason, severity: 'CRITICAL' }, actorId),

  reinstated: (supplier, actorId) => emit(EVENTS.REINSTATED, base(supplier), actorId),

  priceUpdated: (supplierId, partIds, actorId) =>
    emit(EVENTS.PRICE_UPDATED, { supplierId, partIds, count: partIds.length }, actorId),

  documentExpiring: (documents) =>
    emit(EVENTS.DOCUMENT_EXPIRING, {
      count: documents.length,
      severity: 'WARNING',
      documents: documents.map((doc) => ({
        documentId: doc.id,
        supplierId: doc.supplierId,
        supplierCode: doc.supplier.code,
        type: doc.type,
        expiresOn: doc.expiresOn
      }))
    }),

  documentExpired: (documents) =>
    emit(EVENTS.DOCUMENT_EXPIRED, {
      count: documents.length,
      severity: 'CRITICAL',
      documents: documents.map((doc) => ({
        documentId: doc.id,
        supplierId: doc.supplierId,
        type: doc.type,
        expiresOn: doc.expiresOn
      }))
    }),

  rated: (supplier, rating, actorId) =>
    emit(
      EVENTS.RATED,
      { ...base(supplier), overallScore: String(rating.overallScore), grade: rating.grade },
      actorId
    ),

  emit
};
