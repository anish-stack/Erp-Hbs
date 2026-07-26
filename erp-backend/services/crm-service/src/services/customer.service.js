'use strict';

const { ApiError, utils, cache } = require('@erp/shared');
const CustomerRepository = require('../repositories/customer.repository');
const RelationRepository = require('../repositories/relation.repository');
const LeadRepository = require('../repositories/lead.repository');
const MasterClient = require('../clients/master.client');
const publisher = require('../events/publisher');
const compliance = require('../utils/compliance');
const { CACHE, CUSTOMER_STATUS } = require('../constants');

function decimal(v) { return v === null || v === undefined ? null : String(v); }

function shape(customer) {
  const limit = Number(customer.creditLimit || 0);
  const used = Number(customer.creditUsed || 0);

  return {
    id: customer.id,
    code: customer.code,
    legalName: customer.legalName,
    tradeName: customer.tradeName,
    type: customer.type,
    status: customer.status,
    gstin: customer.gstin,
    pan: customer.pan,
    taxTreatment: customer.taxTreatment,
    email: customer.email,
    phone: customer.phone,
    website: customer.website,
    currencyCode: customer.currencyCode,
    paymentTermDays: customer.paymentTermDays,
    credit: {
      limit: decimal(customer.creditLimit),
      used: decimal(customer.creditUsed),
      available: String(Math.max(limit - used, 0)),
      utilisationPercent: limit > 0 ? Number(((used / limit) * 100).toFixed(1)) : 0,
      onHold: customer.creditHoldOverride,
      breached: !customer.creditHoldOverride && used > limit
    },
    industry: customer.industry,
    segment: customer.segment,
    ownerId: customer.ownerId,
    leadId: customer.leadId,
    notes: customer.notes,
    addresses: customer.addresses,
    contacts: customer.contacts,
    creditLogs: customer.creditLogs,
    activities: customer.activities,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt
  };
}

function assertCompliance(payload) {
  const errors = [];
  const gstin = compliance.validateGstin(payload.gstin);
  if (!gstin.valid) errors.push({ field: 'gstin', message: gstin.reason });

  const pan = compliance.validatePan(payload.pan);
  if (!pan.valid) errors.push({ field: 'pan', message: pan.reason });

  if (gstin.valid && !gstin.skipped && pan.valid && !pan.skipped && gstin.pan !== pan.normalized) {
    errors.push({ field: 'pan', message: 'PAN does not match the PAN embedded in the GSTIN' });
  }

  if (errors.length) throw ApiError.validation('Compliance validation failed', errors);
}

class CustomerService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['code', 'legalName', 'createdAt', 'creditUsed'],
      defaultSortField: 'createdAt'
    });

    const where = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.segment ? { segment: query.segment } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.search
        ? { OR: [{ code: { contains: query.search } }, { legalName: { contains: query.search } }, { email: { contains: query.search } }, { gstin: { contains: query.search } }] }
        : {})
    };

    const { items, total } = await CustomerRepository.paginate({ where, skip: pagination.skip, take: pagination.take, orderBy: pagination.orderBy });
    return {
      items: items.map((row) => ({ ...row, creditLimit: decimal(row.creditLimit), creditUsed: decimal(row.creditUsed) })),
      total, page: pagination.page, limit: pagination.limit
    };
  }

  static async options() {
    return cache.remember(CACHE.customerOptions(), 600, () => CustomerRepository.options());
  }

  static async getById(id) {
    const customer = await CustomerRepository.findById(id, { detailed: true });
    if (!customer) throw ApiError.notFound('Customer not found');
    return shape(customer);
  }

  static async create(payload, user) {
    assertCompliance(payload);

    if (payload.gstin) {
      const duplicate = await CustomerRepository.findByGstin(payload.gstin.toUpperCase());
      if (duplicate) throw ApiError.conflict('A customer with this GSTIN already exists', { field: 'gstin', existingCode: duplicate.code });
    }

    const code = payload.code ? payload.code.toUpperCase() : await MasterClient.nextCustomerCode(user);
    if (await CustomerRepository.findByCode(code)) {
      throw ApiError.conflict('A customer with this code already exists', { field: 'code' });
    }

    const customer = await CustomerRepository.create({
      code,
      legalName: payload.legalName,
      tradeName: payload.tradeName || null,
      type: payload.type || 'BUSINESS',
      status: CUSTOMER_STATUS.ACTIVE,
      gstin: payload.gstin ? payload.gstin.toUpperCase() : null,
      pan: payload.pan ? payload.pan.toUpperCase() : null,
      taxTreatment: payload.taxTreatment || 'REGISTERED',
      email: payload.email || null,
      phone: payload.phone || null,
      website: payload.website || null,
      currencyCode: payload.currencyCode || 'INR',
      paymentTermDays: payload.paymentTermDays ?? 30,
      creditLimit: payload.creditLimit ?? 0,
      creditUsed: 0,
      industry: payload.industry || null,
      segment: payload.segment || 'SMB',
      ownerId: payload.ownerId || user.id,
      leadId: payload.leadId || null,
      notes: payload.notes || null
    }, user.id);

    if (payload.creditLimit) {
      await RelationRepository.createCreditLog({
        customerId: customer.id, type: 'LIMIT_SET', amount: payload.creditLimit,
        balanceAfter: payload.creditLimit, notes: 'Initial credit limit', actorId: user.id
      });
    }

    await cache.del(CACHE.customerOptions());
    await publisher.customerCreated(customer, user.id);

    return shape(customer);
  }

  static async update(id, payload, user) {
    const existing = await CustomerRepository.findById(id);
    if (!existing) throw ApiError.notFound('Customer not found');

    if (existing.status === CUSTOMER_STATUS.BLACKLISTED) {
      throw ApiError.forbidden('A blacklisted customer cannot be edited');
    }

    assertCompliance({ ...existing, ...payload });

    if (payload.gstin && payload.gstin.toUpperCase() !== existing.gstin) {
      const duplicate = await CustomerRepository.findByGstin(payload.gstin.toUpperCase());
      if (duplicate && duplicate.id !== id) throw ApiError.conflict('A customer with this GSTIN already exists', { field: 'gstin' });
    }

    const data = { ...payload };
    delete data.code;
    delete data.creditUsed;
    for (const field of ['gstin', 'pan']) if (data[field]) data[field] = data[field].toUpperCase();

    const customer = await CustomerRepository.update(id, data, user.id);
    await cache.del(CACHE.customerOptions());
    await publisher.customerUpdated(customer, Object.keys(data), user.id);

    return shape(customer);
  }

  static async remove(id, user) {
    const existing = await CustomerRepository.findById(id);
    if (!existing) throw ApiError.notFound('Customer not found');
    if (Number(existing.creditUsed) > 0) {
      throw ApiError.conflict('Customer has an outstanding credit balance and cannot be deleted');
    }
    await CustomerRepository.softDelete(id, user.id);
    await cache.del(CACHE.customerOptions());
    return { deleted: true };
  }

  static async setStatus(id, status, reason, user) {
    const existing = await CustomerRepository.findById(id);
    if (!existing) throw ApiError.notFound('Customer not found');

    const customer = await CustomerRepository.update(id, { status }, user.id);
    await cache.del(CACHE.customerOptions());

    if (status === CUSTOMER_STATUS.BLACKLISTED) await publisher.customerBlacklisted(customer, reason, user.id);
    else await publisher.customerUpdated(customer, ['status'], user.id);

    return shape(customer);
  }

  /**
   * Adjusts the credit meter atomically (row-locked). Positive delta consumes
   * credit (a sale), negative delta releases it (a payment or credit note).
   */
  static async adjustCredit(id, { type, amount, reference, notes }, user) {
    const customer = await CustomerRepository.findById(id);
    if (!customer) throw ApiError.notFound('Customer not found');

    const delta = ['SALE'].includes(type) ? amount : -amount;
    const result = await CustomerRepository.adjustCredit(id, delta);
    if (!result) throw ApiError.notFound('Customer not found');

    await RelationRepository.createCreditLog({
      customerId: id, type, amount, balanceAfter: result.creditUsed,
      reference: reference || null, notes: notes || null, actorId: user.id
    });

    await publisher.creditChanged(customer, delta, { used: result.creditUsed, limit: result.creditLimit, available: result.available }, user.id);

    if (result.breached) {
      await publisher.creditBreached(customer, { used: result.creditUsed, limit: result.creditLimit }, user.id);
    }

    return {
      customerId: id,
      creditLimit: String(result.creditLimit),
      creditUsed: String(result.creditUsed),
      available: String(result.available),
      breached: result.breached
    };
  }

  /** Called before Sales confirms an order: does this customer have room? */
  static async checkCreditAvailability(id, requestedAmount) {
    const customer = await CustomerRepository.findById(id);
    if (!customer) throw ApiError.notFound('Customer not found');

    if (customer.status !== CUSTOMER_STATUS.ACTIVE) {
      return { allowed: false, reason: `Customer status is ${customer.status}` };
    }

    const limit = Number(customer.creditLimit);
    const used = Number(customer.creditUsed);
    const available = limit - used;

    if (customer.creditHoldOverride) return { allowed: true, available, overridden: true };

    return {
      allowed: requestedAmount <= available,
      available,
      requested: requestedAmount,
      shortfall: requestedAmount > available ? Number((requestedAmount - available).toFixed(2)) : 0
    };
  }

  static async stats() {
    const raw = await CustomerRepository.stats();
    return {
      total: raw.totals._count._all,
      totalCreditLimit: decimal(raw.totals._sum.creditLimit),
      totalCreditUsed: decimal(raw.totals._sum.creditUsed),
      byStatus: raw.byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      bySegment: raw.bySegment.map((r) => ({ segment: r.segment, count: r._count._all }))
    };
  }

  // -------------------- Child records --------------------
  static async addAddress(customerId, payload) {
    await CustomerService.assertExists(customerId);
    if (payload.isPrimary) await RelationRepository.clearPrimaryAddress(customerId, payload.type);
    const address = await RelationRepository.createAddress({ ...payload, customerId });
    return address;
  }

  static async updateAddress(customerId, addressId, payload) {
    const address = await RelationRepository.findAddress(addressId);
    if (!address || address.customerId !== customerId) throw ApiError.notFound('Address not found');
    if (payload.isPrimary) await RelationRepository.clearPrimaryAddress(customerId, payload.type || address.type);
    return RelationRepository.updateAddress(addressId, payload);
  }

  static async removeAddress(customerId, addressId) {
    const address = await RelationRepository.findAddress(addressId);
    if (!address || address.customerId !== customerId) throw ApiError.notFound('Address not found');
    await RelationRepository.deleteAddress(addressId);
    return { deleted: true };
  }

  static async addContact(customerId, payload) {
    await CustomerService.assertExists(customerId);
    if (payload.isPrimary) await RelationRepository.clearPrimaryContact(customerId);
    return RelationRepository.createContact({ ...payload, customerId });
  }

  static async updateContact(customerId, contactId, payload) {
    const contact = await RelationRepository.findContact(contactId);
    if (!contact || contact.customerId !== customerId) throw ApiError.notFound('Contact not found');
    if (payload.isPrimary) await RelationRepository.clearPrimaryContact(customerId);
    return RelationRepository.updateContact(contactId, payload);
  }

  static async removeContact(customerId, contactId) {
    const contact = await RelationRepository.findContact(contactId);
    if (!contact || contact.customerId !== customerId) throw ApiError.notFound('Contact not found');
    await RelationRepository.deleteContact(contactId);
    return { deleted: true };
  }

  static async assertExists(customerId) {
    const customer = await CustomerRepository.findById(customerId);
    if (!customer) throw ApiError.notFound('Customer not found');
    return customer;
  }

  static shape = shape;
  static assertCompliance = assertCompliance;
}

module.exports = CustomerService;
