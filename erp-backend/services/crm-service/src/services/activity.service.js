'use strict';

const { ApiError, utils } = require('@erp/shared');
const RelationRepository = require('../repositories/relation.repository');
const LeadRepository = require('../repositories/lead.repository');
const CustomerRepository = require('../repositories/customer.repository');

class ActivityService {
  static async create(payload, user) {
    if (!payload.leadId && !payload.customerId) {
      throw ApiError.badRequest('Either leadId or customerId is required');
    }

    if (payload.leadId) {
      const lead = await LeadRepository.findById(payload.leadId);
      if (!lead) throw ApiError.notFound('Lead not found');
    }
    if (payload.customerId) {
      const customer = await CustomerRepository.findById(payload.customerId);
      if (!customer) throw ApiError.notFound('Customer not found');
    }

    return RelationRepository.createActivity({
      leadId: payload.leadId || null,
      customerId: payload.customerId || null,
      type: payload.type,
      subject: payload.subject,
      notes: payload.notes || null,
      dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
      createdBy: user.id
    });
  }

  static async complete(id, outcome, user) {
    const activity = await RelationRepository.findActivity(id);
    if (!activity) throw ApiError.notFound('Activity not found');

    return RelationRepository.updateActivity(id, { completedAt: new Date(), outcome: outcome || null });
  }

  static async listForLead(leadId, query) {
    const pagination = utils.pagination.buildPagination(query, { defaultLimit: 20 });
    const result = await RelationRepository.listActivities({ leadId }, { skip: pagination.skip, take: pagination.take });
    return { ...result, page: pagination.page, limit: pagination.limit };
  }

  static async listForCustomer(customerId, query) {
    const pagination = utils.pagination.buildPagination(query, { defaultLimit: 20 });
    const result = await RelationRepository.listActivities({ customerId }, { skip: pagination.skip, take: pagination.take });
    return { ...result, page: pagination.page, limit: pagination.limit };
  }
}

module.exports = ActivityService;
