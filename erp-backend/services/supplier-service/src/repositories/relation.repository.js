'use strict';

const { prisma } = require('../config/prisma');

/** Addresses, contacts, bank accounts and documents share the same shape of work. */
class RelationRepository {
  // -------------------- Addresses --------------------
  static async createAddress(data) {
    return prisma.supplierAddress.create({ data });
  }

  static async updateAddress(id, data) {
    return prisma.supplierAddress.update({ where: { id }, data });
  }

  static async deleteAddress(id) {
    return prisma.supplierAddress.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  static async findAddress(id) {
    return prisma.supplierAddress.findFirst({ where: { id, deletedAt: null } });
  }

  static async clearPrimaryAddress(supplierId, type) {
    return prisma.supplierAddress.updateMany({
      where: { supplierId, type, isPrimary: true },
      data: { isPrimary: false }
    });
  }

  // -------------------- Contacts --------------------
  static async createContact(data) {
    return prisma.supplierContact.create({ data });
  }

  static async updateContact(id, data) {
    return prisma.supplierContact.update({ where: { id }, data });
  }

  static async deleteContact(id) {
    return prisma.supplierContact.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  static async findContact(id) {
    return prisma.supplierContact.findFirst({ where: { id, deletedAt: null } });
  }

  static async clearPrimaryContact(supplierId) {
    return prisma.supplierContact.updateMany({
      where: { supplierId, isPrimary: true },
      data: { isPrimary: false }
    });
  }

  // -------------------- Bank accounts --------------------
  static async createBankAccount(data) {
    return prisma.supplierBankAccount.create({ data });
  }

  static async updateBankAccount(id, data) {
    return prisma.supplierBankAccount.update({ where: { id }, data });
  }

  static async deleteBankAccount(id) {
    return prisma.supplierBankAccount.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  static async findBankAccount(id) {
    return prisma.supplierBankAccount.findFirst({ where: { id, deletedAt: null } });
  }

  static async clearPrimaryBank(supplierId) {
    return prisma.supplierBankAccount.updateMany({
      where: { supplierId, isPrimary: true },
      data: { isPrimary: false }
    });
  }

  // -------------------- Documents --------------------
  static async createDocument(data) {
    return prisma.supplierDocument.create({ data });
  }

  static async updateDocument(id, data) {
    return prisma.supplierDocument.update({ where: { id }, data });
  }

  static async deleteDocument(id) {
    return prisma.supplierDocument.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  static async findDocument(id) {
    return prisma.supplierDocument.findFirst({ where: { id, deletedAt: null } });
  }

  static async expiringDocuments(from, to) {
    return prisma.supplierDocument.findMany({
      where: {
        deletedAt: null,
        expiresOn: { gte: from, lte: to },
        OR: [{ expiryNotifiedAt: null }, { expiryNotifiedAt: { lt: from } }]
      },
      include: { supplier: { select: { id: true, code: true, legalName: true, email: true } } }
    });
  }

  static async expiredDocuments(before) {
    return prisma.supplierDocument.findMany({
      where: { deletedAt: null, expiresOn: { lt: before } },
      include: { supplier: { select: { id: true, code: true, legalName: true } } },
      take: 500
    });
  }

  static async markExpiryNotified(ids) {
    return prisma.supplierDocument.updateMany({
      where: { id: { in: ids } },
      data: { expiryNotifiedAt: new Date() }
    });
  }
}

module.exports = RelationRepository;
