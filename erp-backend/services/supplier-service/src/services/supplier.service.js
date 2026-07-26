'use strict';

const { ApiError, utils, cache } = require('@erp/shared');
const SupplierRepository = require('../repositories/supplier.repository');
const RelationRepository = require('../repositories/relation.repository');
const MasterClient = require('../clients/master.client');
const publisher = require('../events/publisher');
const compliance = require('../utils/compliance');
const { CACHE, SUPPLIER_STATUS } = require('../constants');
const config = require('../config');

function decimal(value) {
  return value === null || value === undefined ? null : String(value);
}

function shapeBank(account) {
  return {
    id: account.id,
    accountName: account.accountName,
    accountNumber: compliance.maskAccountNumber(account.accountNumber),
    accountLast4: account.accountLast4,
    ifsc: account.ifsc,
    swift: account.swift,
    bankName: account.bankName,
    branch: account.branch,
    currencyCode: account.currencyCode,
    isPrimary: account.isPrimary,
    isVerified: account.isVerified,
    verifiedAt: account.verifiedAt
  };
}

function shape(supplier) {
  return {
    id: supplier.id,
    code: supplier.code,
    legalName: supplier.legalName,
    tradeName: supplier.tradeName,
    type: supplier.type,
    status: supplier.status,
    canTransact: supplier.status === SUPPLIER_STATUS.APPROVED,
    gstin: supplier.gstin,
    pan: supplier.pan,
    cin: supplier.cin,
    msmeNumber: supplier.msmeNumber,
    taxTreatment: supplier.taxTreatment,
    email: supplier.email,
    phone: supplier.phone,
    website: supplier.website,
    currencyCode: supplier.currencyCode,
    paymentTermDays: supplier.paymentTermDays,
    creditLimit: decimal(supplier.creditLimit),
    incoterm: supplier.incoterm,
    defaultLeadTime: supplier.defaultLeadTime,
    categoryIds: supplier.categoryIds || [],
    manufacturerIds: supplier.manufacturerIds || [],
    isPreferred: supplier.isPreferred,
    riskLevel: supplier.riskLevel,
    overallRating: decimal(supplier.overallRating),
    lastEvaluatedAt: supplier.lastEvaluatedAt,
    notes: supplier.notes,
    approval: {
      submittedAt: supplier.submittedAt,
      approvedAt: supplier.approvedAt,
      rejectedAt: supplier.rejectedAt,
      rejectionReason: supplier.rejectionReason,
      blacklistedAt: supplier.blacklistedAt,
      blacklistReason: supplier.blacklistReason
    },
    addresses: supplier.addresses,
    contacts: supplier.contacts,
    bankAccounts: supplier.bankAccounts ? supplier.bankAccounts.map(shapeBank) : undefined,
    documents: supplier.documents,
    ratings: supplier.ratings
      ? supplier.ratings.map((rating) => ({
          periodStart: rating.periodStart,
          periodEnd: rating.periodEnd,
          overallScore: decimal(rating.overallScore),
          grade: rating.grade
        }))
      : undefined,
    statusHistory: supplier.statusLogs,
    counts: supplier._count,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt
  };
}

/** Rejects malformed statutory identifiers before anything is written. */
function assertCompliance(payload) {
  const errors = [];

  const gstin = compliance.validateGstin(payload.gstin);
  if (!gstin.valid) errors.push({ field: 'gstin', message: gstin.reason });

  const pan = compliance.validatePan(payload.pan);
  if (!pan.valid) errors.push({ field: 'pan', message: pan.reason });

  const cin = compliance.validateCin(payload.cin);
  if (!cin.valid) errors.push({ field: 'cin', message: cin.reason });

  if (gstin.valid && !gstin.skipped && pan.valid && !pan.skipped && gstin.pan !== pan.normalized) {
    errors.push({ field: 'pan', message: 'PAN does not match the PAN embedded in the GSTIN' });
  }

  if (errors.length) throw ApiError.validation('Compliance validation failed', errors);

  return { gstin, pan, cin };
}

class SupplierService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['code', 'legalName', 'createdAt', 'overallRating'],
      defaultSortField: 'createdAt'
    });

    const where = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.riskLevel ? { riskLevel: query.riskLevel } : {}),
      ...(query.isPreferred !== undefined ? { isPreferred: query.isPreferred } : {}),
      ...(query.currencyCode ? { currencyCode: query.currencyCode } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search } },
              { legalName: { contains: query.search } },
              { tradeName: { contains: query.search } },
              { gstin: { contains: query.search } },
              { email: { contains: query.search } }
            ]
          }
        : {})
    };

    const { items, total } = await SupplierRepository.paginate({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy
    });

    return {
      items: items.map((row) => ({
        ...row,
        creditLimit: decimal(row.creditLimit),
        overallRating: decimal(row.overallRating),
        canTransact: row.status === SUPPLIER_STATUS.APPROVED
      })),
      total,
      page: pagination.page,
      limit: pagination.limit
    };
  }

  static async options() {
    return cache.remember(CACHE.options(), config.cacheTtl, () => SupplierRepository.options());
  }

  static async getById(id) {
    const supplier = await SupplierRepository.findById(id, { detailed: true });
    if (!supplier) throw ApiError.notFound('Supplier not found');
    return shape(supplier);
  }

  static async create(payload, user) {
    assertCompliance(payload);

    if (payload.gstin) {
      const duplicate = await SupplierRepository.findByGstin(payload.gstin.toUpperCase());
      if (duplicate) {
        throw ApiError.conflict('A supplier with this GSTIN already exists', {
          field: 'gstin',
          existingCode: duplicate.code
        });
      }
    }

    const code = payload.code
      ? payload.code.toUpperCase()
      : await MasterClient.nextSupplierCode(user);

    if (await SupplierRepository.findByCode(code)) {
      throw ApiError.conflict('A supplier with this code already exists', { field: 'code' });
    }

    const supplier = await SupplierRepository.create(
      {
        code,
        legalName: payload.legalName,
        tradeName: payload.tradeName || null,
        type: payload.type || 'DISTRIBUTOR',
        status: SUPPLIER_STATUS.DRAFT,
        gstin: payload.gstin ? payload.gstin.toUpperCase() : null,
        pan: payload.pan ? payload.pan.toUpperCase() : null,
        cin: payload.cin ? payload.cin.toUpperCase() : null,
        msmeNumber: payload.msmeNumber || null,
        taxTreatment: payload.taxTreatment || 'REGISTERED',
        email: payload.email || null,
        phone: payload.phone || null,
        website: payload.website || null,
        currencyCode: payload.currencyCode || 'INR',
        paymentTermDays: payload.paymentTermDays ?? 30,
        creditLimit: payload.creditLimit ?? null,
        incoterm: payload.incoterm || null,
        defaultLeadTime: payload.defaultLeadTime ?? null,
        categoryIds: payload.categoryIds || [],
        manufacturerIds: payload.manufacturerIds || [],
        riskLevel: payload.riskLevel || 'MEDIUM',
        notes: payload.notes || null
      },
      user.id
    );

    await SupplierRepository.logStatus({
      supplierId: supplier.id,
      fromStatus: null,
      toStatus: SUPPLIER_STATUS.DRAFT,
      reason: 'Supplier created',
      actorId: user.id
    });

    await cache.del(CACHE.options());
    await publisher.created(supplier, user.id);

    return shape(supplier);
  }

  static async update(id, payload, user) {
    const existing = await SupplierRepository.findById(id);
    if (!existing) throw ApiError.notFound('Supplier not found');

    if (existing.status === SUPPLIER_STATUS.BLACKLISTED) {
      throw ApiError.forbidden('A blacklisted supplier cannot be edited. Reinstate it first');
    }

    assertCompliance({ ...existing, ...payload });

    if (payload.gstin && payload.gstin.toUpperCase() !== existing.gstin) {
      const duplicate = await SupplierRepository.findByGstin(payload.gstin.toUpperCase());
      if (duplicate && duplicate.id !== id) {
        throw ApiError.conflict('A supplier with this GSTIN already exists', { field: 'gstin' });
      }
    }

    const data = { ...payload };
    delete data.status;
    delete data.code;

    for (const field of ['gstin', 'pan', 'cin']) {
      if (data[field]) data[field] = data[field].toUpperCase();
    }

    const supplier = await SupplierRepository.update(id, data, user.id);

    await cache.del(CACHE.supplier(id), CACHE.options());
    await publisher.updated(supplier, Object.keys(data), user.id);

    return shape(supplier);
  }

  static async remove(id, user) {
    const existing = await SupplierRepository.findById(id);
    if (!existing) throw ApiError.notFound('Supplier not found');

    if (existing.status === SUPPLIER_STATUS.APPROVED) {
      throw ApiError.conflict(
        'An approved supplier cannot be deleted. Set it to inactive or blacklist it instead'
      );
    }

    await SupplierRepository.softDelete(id, user.id);
    await cache.del(CACHE.supplier(id), CACHE.options());

    return { deleted: true };
  }

  static async stats() {
    const raw = await SupplierRepository.stats();

    return {
      total: raw.totals._count._all,
      averageRating: decimal(raw.totals._avg.overallRating),
      byStatus: raw.byStatus.map((row) => ({ status: row.status, count: row._count._all })),
      byType: raw.byType.map((row) => ({ type: row.type, count: row._count._all })),
      byRisk: raw.byRisk.map((row) => ({ riskLevel: row.riskLevel, count: row._count._all }))
    };
  }

  // -------------------- Child records --------------------

  static async addAddress(supplierId, payload, user) {
    await SupplierService.assertExists(supplierId);

    if (payload.isPrimary) await RelationRepository.clearPrimaryAddress(supplierId, payload.type);

    const address = await RelationRepository.createAddress({ ...payload, supplierId });
    await cache.del(CACHE.supplier(supplierId));
    await publisher.updated({ id: supplierId, code: '', legalName: '', status: '' }, ['address'], user.id);

    return address;
  }

  static async updateAddress(supplierId, addressId, payload) {
    const address = await RelationRepository.findAddress(addressId);
    if (!address || address.supplierId !== supplierId) throw ApiError.notFound('Address not found');

    if (payload.isPrimary) {
      await RelationRepository.clearPrimaryAddress(supplierId, payload.type || address.type);
    }

    const updated = await RelationRepository.updateAddress(addressId, payload);
    await cache.del(CACHE.supplier(supplierId));
    return updated;
  }

  static async removeAddress(supplierId, addressId) {
    const address = await RelationRepository.findAddress(addressId);
    if (!address || address.supplierId !== supplierId) throw ApiError.notFound('Address not found');

    await RelationRepository.deleteAddress(addressId);
    await cache.del(CACHE.supplier(supplierId));
    return { deleted: true };
  }

  static async addContact(supplierId, payload) {
    await SupplierService.assertExists(supplierId);
    if (payload.isPrimary) await RelationRepository.clearPrimaryContact(supplierId);

    const contact = await RelationRepository.createContact({ ...payload, supplierId });
    await cache.del(CACHE.supplier(supplierId));
    return contact;
  }

  static async updateContact(supplierId, contactId, payload) {
    const contact = await RelationRepository.findContact(contactId);
    if (!contact || contact.supplierId !== supplierId) throw ApiError.notFound('Contact not found');

    if (payload.isPrimary) await RelationRepository.clearPrimaryContact(supplierId);

    const updated = await RelationRepository.updateContact(contactId, payload);
    await cache.del(CACHE.supplier(supplierId));
    return updated;
  }

  static async removeContact(supplierId, contactId) {
    const contact = await RelationRepository.findContact(contactId);
    if (!contact || contact.supplierId !== supplierId) throw ApiError.notFound('Contact not found');

    await RelationRepository.deleteContact(contactId);
    await cache.del(CACHE.supplier(supplierId));
    return { deleted: true };
  }

  /** Bank details are write-once-read-masked: the full number never comes back. */
  static async addBankAccount(supplierId, payload) {
    await SupplierService.assertExists(supplierId);

    const ifsc = compliance.validateIfsc(payload.ifsc);
    if (!ifsc.valid) throw ApiError.validation('Bank details invalid', [{ field: 'ifsc', message: ifsc.reason }]);

    if (payload.isPrimary) await RelationRepository.clearPrimaryBank(supplierId);

    const account = await RelationRepository.createBankAccount({
      ...payload,
      supplierId,
      ifsc: ifsc.normalized || null,
      accountLast4: String(payload.accountNumber).slice(-4)
    });

    await cache.del(CACHE.supplier(supplierId));
    return shapeBank(account);
  }

  static async verifyBankAccount(supplierId, accountId, user) {
    const account = await RelationRepository.findBankAccount(accountId);
    if (!account || account.supplierId !== supplierId) throw ApiError.notFound('Bank account not found');

    const updated = await RelationRepository.updateBankAccount(accountId, {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: user.id
    });

    await cache.del(CACHE.supplier(supplierId));
    return shapeBank(updated);
  }

  static async removeBankAccount(supplierId, accountId) {
    const account = await RelationRepository.findBankAccount(accountId);
    if (!account || account.supplierId !== supplierId) throw ApiError.notFound('Bank account not found');

    await RelationRepository.deleteBankAccount(accountId);
    await cache.del(CACHE.supplier(supplierId));
    return { deleted: true };
  }

  static async assertExists(supplierId) {
    const supplier = await SupplierRepository.findById(supplierId);
    if (!supplier) throw ApiError.notFound('Supplier not found');
    return supplier;
  }

  static shape = shape;
  static assertCompliance = assertCompliance;
}

module.exports = SupplierService;
