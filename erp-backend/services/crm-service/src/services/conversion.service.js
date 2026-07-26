'use strict';

const { ApiError } = require('@erp/shared');
const LeadRepository = require('../repositories/lead.repository');
const CustomerRepository = require('../repositories/customer.repository');
const MasterClient = require('../clients/master.client');
const CustomerService = require('./customer.service');
const LeadService = require('./lead.service');
const publisher = require('../events/publisher');
const { LEAD_STAGE } = require('../constants');

class ConversionService {
  /** Turns a WON lead into a customer record in one step. */
  static async convert(leadId, payload, user) {
    const lead = await LeadRepository.findById(leadId);
    if (!lead) throw ApiError.notFound('Lead not found');

    if (lead.stage !== LEAD_STAGE.WON) {
      throw ApiError.badRequest('Only a WON lead can be converted to a customer', { currentStage: lead.stage });
    }
    if (lead.convertedToId) {
      throw ApiError.conflict('This lead has already been converted', { customerId: lead.convertedToId });
    }

    CustomerService.assertCompliance(payload);

    const code = payload.code
      ? payload.code.toUpperCase()
      : await MasterClient.nextCustomerCode(user);

    const customer = await CustomerRepository.create({
      code,
      legalName: payload.legalName || lead.companyName,
      tradeName: payload.tradeName || null,
      type: payload.type || 'BUSINESS',
      status: 'ACTIVE',
      gstin: payload.gstin ? payload.gstin.toUpperCase() : null,
      pan: payload.pan ? payload.pan.toUpperCase() : null,
      taxTreatment: payload.taxTreatment || 'REGISTERED',
      email: payload.email || lead.email || null,
      phone: payload.phone || lead.phone || null,
      currencyCode: payload.currencyCode || lead.currencyCode || 'INR',
      paymentTermDays: payload.paymentTermDays ?? 30,
      creditLimit: payload.creditLimit ?? 0,
      creditUsed: 0,
      segment: payload.segment || 'SMB',
      ownerId: lead.ownerId,
      leadId: lead.id,
      notes: `Converted from lead ${lead.code}`
    }, user.id);

    await LeadRepository.update(leadId, { convertedAt: new Date(), convertedToId: customer.id }, user.id);

    await publisher.leadConverted(lead, customer, user.id);

    return { lead: LeadService.shape({ ...lead, convertedAt: new Date(), convertedToId: customer.id }), customer: CustomerService.shape(customer) };
  }
}

module.exports = ConversionService;
