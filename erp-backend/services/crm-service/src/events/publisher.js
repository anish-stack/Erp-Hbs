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
  leadCreated: (lead, actorId) =>
    emit(EVENTS.LEAD_CREATED, { leadId: lead.id, code: lead.code, companyName: lead.companyName, ownerId: lead.ownerId }, actorId),

  leadStageChanged: (lead, fromStage, actorId) =>
    emit(EVENTS.LEAD_STAGE_CHANGED, {
      leadId: lead.id, code: lead.code, fromStage, toStage: lead.stage,
      severity: lead.stage === 'LOST' ? 'WARNING' : 'INFO'
    }, actorId),

  leadConverted: (lead, customer, actorId) =>
    emit(EVENTS.LEAD_CONVERTED, { leadId: lead.id, leadCode: lead.code, customerId: customer.id, customerCode: customer.code }, actorId),

  leadStale: (leads) =>
    emit(EVENTS.LEAD_STALE, { count: leads.length, severity: 'WARNING', leads: leads.map((l) => ({ leadId: l.id, code: l.code, ownerId: l.ownerId })) }),

  customerCreated: (customer, actorId) =>
    emit(EVENTS.CUSTOMER_CREATED, { customerId: customer.id, code: customer.code, legalName: customer.legalName }, actorId),

  customerUpdated: (customer, changes, actorId) =>
    emit(EVENTS.CUSTOMER_UPDATED, { customerId: customer.id, code: customer.code, changes }, actorId),

  creditChanged: (customer, delta, result, actorId) =>
    emit(EVENTS.CUSTOMER_CREDIT_CHANGED, {
      customerId: customer.id, code: customer.code, delta,
      creditUsed: result.used, creditLimit: result.limit, available: result.available
    }, actorId),

  creditBreached: (customer, result, actorId) =>
    emit(EVENTS.CUSTOMER_CREDIT_BREACHED, {
      customerId: customer.id, code: customer.code, severity: 'CRITICAL',
      creditUsed: result.used, creditLimit: result.limit
    }, actorId),

  customerBlacklisted: (customer, reason, actorId) =>
    emit(EVENTS.CUSTOMER_BLACKLISTED, { customerId: customer.id, code: customer.code, reason, severity: 'CRITICAL' }, actorId),

  followUpDue: (leads) =>
    emit(EVENTS.FOLLOWUP_DUE, { count: leads.length, leads: leads.map((l) => ({ leadId: l.id, code: l.code, ownerId: l.ownerId })) }),

  emit
};
