'use strict';

const { ApiError, cache, logger } = require('@erp/shared');
const RelationRepository = require('../repositories/relation.repository');
const SupplierService = require('./supplier.service');
const publisher = require('../events/publisher');
const config = require('../config');
const { CACHE } = require('../constants');

class DocumentService {
  static async add(supplierId, payload, user) {
    await SupplierService.assertExists(supplierId);

    if (payload.expiresOn && payload.issuedOn && new Date(payload.expiresOn) <= new Date(payload.issuedOn)) {
      throw ApiError.badRequest('expiresOn must be after issuedOn');
    }

    const document = await RelationRepository.createDocument({
      supplierId,
      type: payload.type,
      fileId: payload.fileId,
      number: payload.number || null,
      issuedOn: payload.issuedOn ? new Date(payload.issuedOn) : null,
      expiresOn: payload.expiresOn ? new Date(payload.expiresOn) : null,
      notes: payload.notes || null,
      uploadedBy: user.id
    });

    await cache.del(CACHE.supplier(supplierId));
    return document;
  }

  static async verify(supplierId, documentId, user) {
    const document = await RelationRepository.findDocument(documentId);
    if (!document || document.supplierId !== supplierId) throw ApiError.notFound('Document not found');

    const updated = await RelationRepository.updateDocument(documentId, {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: user.id
    });

    await cache.del(CACHE.supplier(supplierId));
    return updated;
  }

  static async remove(supplierId, documentId) {
    const document = await RelationRepository.findDocument(documentId);
    if (!document || document.supplierId !== supplierId) throw ApiError.notFound('Document not found');

    await RelationRepository.deleteDocument(documentId);
    await cache.del(CACHE.supplier(supplierId));

    return { deleted: true };
  }

  /**
   * Daily scan: warns about documents expiring inside the warning window and
   * flags anything already expired. Notifications are sent once per window.
   */
  static async scanExpiries() {
    const now = new Date();
    const horizon = new Date(now.getTime() + config.documents.expiryWarnDays * 86400000);

    const [expiring, expired] = await Promise.all([
      RelationRepository.expiringDocuments(now, horizon),
      RelationRepository.expiredDocuments(now)
    ]);

    if (expiring.length) {
      await publisher.documentExpiring(expiring);
      await RelationRepository.markExpiryNotified(expiring.map((doc) => doc.id));
      logger.warn('%d supplier document(s) expiring within %d days', expiring.length, config.documents.expiryWarnDays);
    }

    if (expired.length) {
      await publisher.documentExpired(expired);
      logger.error('%d supplier document(s) have expired', expired.length);
    }

    return { expiring: expiring.length, expired: expired.length };
  }
}

module.exports = DocumentService;
