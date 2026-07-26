'use strict';

const { prisma } = require('../config/prisma');

/** UOMs, currencies and tax rates share one thin repository. */
class LookupRepository {
  // -------------------- UOM --------------------
  static async uoms({ includeInactive = false } = {}) {
    return prisma.uom.findMany({
      where: { deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { code: 'asc' }
    });
  }

  static async uomById(id) {
    return prisma.uom.findFirst({ where: { id, deletedAt: null } });
  }

  static async uomByCode(code) {
    return prisma.uom.findFirst({ where: { code, deletedAt: null } });
  }

  static async createUom(data) {
    return prisma.uom.create({ data });
  }

  static async updateUom(id, data) {
    return prisma.uom.update({ where: { id }, data });
  }

  // -------------------- Currency --------------------
  static async currencies({ includeInactive = false } = {}) {
    return prisma.currency.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ isBase: 'desc' }, { code: 'asc' }]
    });
  }

  static async currencyById(id) {
    return prisma.currency.findUnique({ where: { id } });
  }

  static async currencyByCode(code) {
    return prisma.currency.findUnique({ where: { code } });
  }

  static async createCurrency(data) {
    return prisma.currency.create({ data });
  }

  static async updateCurrency(id, data) {
    return prisma.currency.update({ where: { id }, data });
  }

  static async clearBaseCurrency() {
    return prisma.currency.updateMany({ where: { isBase: true }, data: { isBase: false } });
  }

  // -------------------- Tax --------------------
  static async taxRates({ includeInactive = false, onDate = null } = {}) {
    const date = onDate || new Date();
    return prisma.taxRate.findMany({
      where: {
        deletedAt: null,
        ...(includeInactive
          ? {}
          : {
              isActive: true,
              effectiveFrom: { lte: date },
              OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }]
            })
      },
      orderBy: { code: 'asc' }
    });
  }

  static async taxRateById(id) {
    return prisma.taxRate.findFirst({ where: { id, deletedAt: null } });
  }

  static async taxRateByCode(code) {
    return prisma.taxRate.findFirst({ where: { code, deletedAt: null } });
  }

  static async taxRateByHsn(hsnCode, onDate = new Date()) {
    return prisma.taxRate.findFirst({
      where: {
        hsnCode,
        deletedAt: null,
        isActive: true,
        effectiveFrom: { lte: onDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: onDate } }]
      },
      orderBy: { effectiveFrom: 'desc' }
    });
  }

  static async createTaxRate(data) {
    return prisma.taxRate.create({ data });
  }

  static async updateTaxRate(id, data) {
    return prisma.taxRate.update({ where: { id }, data });
  }
}

module.exports = LookupRepository;
