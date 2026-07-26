'use strict';

const { ApiError, cache, logger } = require('@erp/shared');
const SupplierRepository = require('../repositories/supplier.repository');
const SupplierService = require('./supplier.service');
const publisher = require('../events/publisher');
const {
  SUPPLIER_STATUS,
  STATUS_TRANSITIONS,
  MANDATORY_DOCUMENTS,
  CACHE
} = require('../constants');

function assertTransition(from, to) {
  const allowed = STATUS_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw ApiError.badRequest(`A supplier cannot move from ${from} to ${to}`, {
      currentStatus: from,
      allowedNext: allowed
    });
  }
}

/** Approval readiness: statutory ids, a primary contact, an address and documents. */
async function readiness(supplier) {
  const documents = await SupplierRepository.documentTypesOf(supplier.id);
  const required = MANDATORY_DOCUMENTS[supplier.taxTreatment] || [];

  const present = new Set(documents.map((doc) => doc.type));
  const missingDocuments = required.filter((type) => !present.has(type));

  const expired = documents.filter((doc) => doc.expiresOn && doc.expiresOn < new Date());

  const issues = [];
  if (!supplier.addresses || !supplier.addresses.length) issues.push('At least one address is required');
  if (!supplier.contacts || !supplier.contacts.length) issues.push('At least one contact is required');
  if (missingDocuments.length) issues.push(`Missing documents: ${missingDocuments.join(', ')}`);
  if (expired.length) issues.push(`${expired.length} document(s) have expired`);

  if (supplier.taxTreatment === 'REGISTERED' && !supplier.gstin) {
    issues.push('GSTIN is mandatory for registered suppliers');
  }
  if (!supplier.bankAccounts || !supplier.bankAccounts.length) {
    issues.push('At least one bank account is required');
  }

  return { ready: issues.length === 0, issues, missingDocuments, expiredDocuments: expired.length };
}

class WorkflowService {
  static async readiness(supplierId) {
    const supplier = await SupplierRepository.findById(supplierId, { detailed: true });
    if (!supplier) throw ApiError.notFound('Supplier not found');

    const result = await readiness(supplier);
    return { supplierId, status: supplier.status, ...result };
  }

  static async transition(supplierId, toStatus, { reason = null } = {}, user) {
    const supplier = await SupplierRepository.findById(supplierId, { detailed: true });
    if (!supplier) throw ApiError.notFound('Supplier not found');

    assertTransition(supplier.status, toStatus);

    const data = { status: toStatus };
    const now = new Date();

    if (toStatus === SUPPLIER_STATUS.PENDING_APPROVAL) {
      const check = await readiness(supplier);
      if (!check.ready) {
        throw ApiError.badRequest('Supplier is not ready for approval', { issues: check.issues });
      }
      data.submittedAt = now;
      data.submittedBy = user.id;
    }

    if (toStatus === SUPPLIER_STATUS.APPROVED) {
      data.approvedAt = now;
      data.approvedBy = user.id;
      data.rejectedAt = null;
      data.rejectionReason = null;
      data.blacklistedAt = null;
      data.blacklistReason = null;
    }

    if (toStatus === SUPPLIER_STATUS.REJECTED) {
      if (!reason) throw ApiError.badRequest('A rejection reason is required');
      data.rejectedAt = now;
      data.rejectedBy = user.id;
      data.rejectionReason = reason;
    }

    if (toStatus === SUPPLIER_STATUS.BLACKLISTED) {
      if (!reason) throw ApiError.badRequest('A blacklist reason is required');
      data.blacklistedAt = now;
      data.blacklistedBy = user.id;
      data.blacklistReason = reason;
      data.isPreferred = false;
      data.riskLevel = 'HIGH';
    }

    const updated = await SupplierRepository.update(supplierId, data, user.id);

    await SupplierRepository.logStatus({
      supplierId,
      fromStatus: supplier.status,
      toStatus,
      reason,
      actorId: user.id
    });

    await cache.del(CACHE.supplier(supplierId), CACHE.options());

    switch (toStatus) {
      case SUPPLIER_STATUS.PENDING_APPROVAL:
        await publisher.submitted(updated, user.id);
        break;
      case SUPPLIER_STATUS.APPROVED:
        await publisher.approved(updated, user.id);
        break;
      case SUPPLIER_STATUS.REJECTED:
        await publisher.rejected(updated, reason, user.id);
        break;
      case SUPPLIER_STATUS.BLACKLISTED:
        await publisher.blacklisted(updated, reason, user.id);
        break;
      case SUPPLIER_STATUS.ON_HOLD:
        await publisher.updated(updated, ['status'], user.id);
        break;
      default:
        await publisher.updated(updated, ['status'], user.id);
    }

    logger.info(
      'Supplier %s moved %s -> %s by %s',
      updated.code,
      supplier.status,
      toStatus,
      user.id
    );

    return SupplierService.shape(updated);
  }

  static submit(supplierId, user) {
    return WorkflowService.transition(supplierId, SUPPLIER_STATUS.PENDING_APPROVAL, {}, user);
  }

  static approve(supplierId, user) {
    return WorkflowService.transition(supplierId, SUPPLIER_STATUS.APPROVED, {}, user);
  }

  static reject(supplierId, reason, user) {
    return WorkflowService.transition(supplierId, SUPPLIER_STATUS.REJECTED, { reason }, user);
  }

  static hold(supplierId, reason, user) {
    return WorkflowService.transition(supplierId, SUPPLIER_STATUS.ON_HOLD, { reason }, user);
  }

  static blacklist(supplierId, reason, user) {
    return WorkflowService.transition(supplierId, SUPPLIER_STATUS.BLACKLISTED, { reason }, user);
  }

  static async reinstate(supplierId, user) {
    const supplier = await SupplierRepository.findById(supplierId);
    if (!supplier) throw ApiError.notFound('Supplier not found');

    if (supplier.status !== SUPPLIER_STATUS.BLACKLISTED) {
      throw ApiError.badRequest('Only a blacklisted supplier can be reinstated');
    }

    const updated = await WorkflowService.transition(
      supplierId,
      SUPPLIER_STATUS.ON_HOLD,
      { reason: 'Reinstated from blacklist' },
      user
    );

    await publisher.reinstated(updated, user.id);
    return updated;
  }

  static assertTransition = assertTransition;
  static readiness = readiness;
}

module.exports = WorkflowService;
