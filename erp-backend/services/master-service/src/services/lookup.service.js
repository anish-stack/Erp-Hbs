'use strict';

const { ApiError } = require('@erp/shared');
const LookupRepository = require('../repositories/lookup.repository');
const CacheService = require('./cache.service');
const publisher = require('../events/publisher');
const { CACHE } = require('../constants');
const config = require('../config');

function decimalise(row, fields) {
  const copy = { ...row };
  for (const field of fields) {
    if (copy[field] !== null && copy[field] !== undefined) copy[field] = String(copy[field]);
  }
  return copy;
}

class LookupService {
  // -------------------- UOM --------------------
  static async uoms(includeInactive = false) {
    if (includeInactive) {
      const rows = await LookupRepository.uoms({ includeInactive: true });
      return rows.map((row) => decimalise(row, ['conversion']));
    }
    return CacheService.remember(CACHE.uoms(), async () => {
      const rows = await LookupRepository.uoms();
      return rows.map((row) => decimalise(row, ['conversion']));
    });
  }

  static async createUom(payload) {
    const code = payload.code.trim().toUpperCase();
    if (await LookupRepository.uomByCode(code)) {
      throw ApiError.conflict('A unit with this code already exists', { field: 'code' });
    }

    const row = await LookupRepository.createUom({ ...payload, code });
    await CacheService.bust('uom-created', [CACHE.uoms()]);
    return decimalise(row, ['conversion']);
  }

  static async updateUom(id, payload) {
    if (!(await LookupRepository.uomById(id))) throw ApiError.notFound('Unit of measure not found');

    const row = await LookupRepository.updateUom(id, payload);
    await CacheService.bust('uom-updated', [CACHE.uoms()]);
    return decimalise(row, ['conversion']);
  }

  /** Converts a quantity between two units that share a base unit. */
  static async convert({ fromUomId, toUomId, quantity }) {
    const [from, to] = await Promise.all([
      LookupRepository.uomById(fromUomId),
      LookupRepository.uomById(toUomId)
    ]);

    if (!from) throw ApiError.badRequest('Source unit not found', { field: 'fromUomId' });
    if (!to) throw ApiError.badRequest('Target unit not found', { field: 'toUomId' });

    const fromBase = from.isBase ? from.id : from.baseUomId;
    const toBase = to.isBase ? to.id : to.baseUomId;

    if (!fromBase || !toBase || fromBase !== toBase) {
      throw ApiError.badRequest('These units do not share a base unit and cannot be converted', {
        from: from.code,
        to: to.code
      });
    }

    const inBase = quantity * Number(from.conversion);
    const converted = inBase / Number(to.conversion);

    return {
      quantity,
      from: from.code,
      to: to.code,
      converted: Number(converted.toFixed(to.decimals)),
      baseQuantity: inBase
    };
  }

  // -------------------- Currency --------------------
  static async currencies(includeInactive = false) {
    if (includeInactive) {
      const rows = await LookupRepository.currencies({ includeInactive: true });
      return rows.map((row) => decimalise(row, ['exchangeRate']));
    }
    return CacheService.remember(CACHE.currencies(), async () => {
      const rows = await LookupRepository.currencies();
      return rows.map((row) => decimalise(row, ['exchangeRate']));
    });
  }

  static async createCurrency(payload) {
    const code = payload.code.trim().toUpperCase();
    if (await LookupRepository.currencyByCode(code)) {
      throw ApiError.conflict('This currency already exists', { field: 'code' });
    }

    if (payload.isBase) await LookupRepository.clearBaseCurrency();

    const row = await LookupRepository.createCurrency({
      ...payload,
      code,
      exchangeRate: payload.isBase ? 1 : payload.exchangeRate || 1,
      rateUpdatedAt: new Date()
    });

    await CacheService.bust('currency-created', [CACHE.currencies()]);
    return decimalise(row, ['exchangeRate']);
  }

  static async updateRate(id, exchangeRate, actorId) {
    const currency = await LookupRepository.currencyById(id);
    if (!currency) throw ApiError.notFound('Currency not found');

    if (currency.isBase && Number(exchangeRate) !== 1) {
      throw ApiError.badRequest('The base currency must always have a rate of 1');
    }

    const row = await LookupRepository.updateCurrency(id, {
      exchangeRate,
      rateUpdatedAt: new Date()
    });

    await CacheService.bust('currency-rate', [CACHE.currencies()]);
    await publisher.currencyRateUpdated(row, actorId);

    return decimalise(row, ['exchangeRate']);
  }

  /** Converts an amount using stored rates, always routing through the base currency. */
  static async convertAmount({ amount, fromCode, toCode }) {
    const [from, to] = await Promise.all([
      LookupRepository.currencyByCode(fromCode.toUpperCase()),
      LookupRepository.currencyByCode(toCode.toUpperCase())
    ]);

    if (!from) throw ApiError.badRequest(`Currency ${fromCode} is not configured`);
    if (!to) throw ApiError.badRequest(`Currency ${toCode} is not configured`);

    const baseAmount = amount / Number(from.exchangeRate);
    const converted = baseAmount * Number(to.exchangeRate);

    return {
      amount,
      from: from.code,
      to: to.code,
      rate: Number((Number(to.exchangeRate) / Number(from.exchangeRate)).toFixed(6)),
      converted: Number(converted.toFixed(to.decimals)),
      baseCurrency: config.baseCurrency,
      ratesUpdatedAt: { from: from.rateUpdatedAt, to: to.rateUpdatedAt }
    };
  }

  // -------------------- Tax --------------------
  static async taxRates(includeInactive = false) {
    if (includeInactive) {
      const rows = await LookupRepository.taxRates({ includeInactive: true });
      return rows.map((row) => decimalise(row, ['ratePercent', 'cgstPercent', 'sgstPercent', 'igstPercent', 'cessPercent']));
    }
    return CacheService.remember(CACHE.taxRates(), async () => {
      const rows = await LookupRepository.taxRates();
      return rows.map((row) =>
        decimalise(row, ['ratePercent', 'cgstPercent', 'sgstPercent', 'igstPercent', 'cessPercent'])
      );
    });
  }

  static async createTaxRate(payload) {
    const code = payload.code.trim().toUpperCase();
    if (await LookupRepository.taxRateByCode(code)) {
      throw ApiError.conflict('A tax rate with this code already exists', { field: 'code' });
    }

    const rate = Number(payload.ratePercent);
    const row = await LookupRepository.createTaxRate({
      ...payload,
      code,
      cgstPercent: payload.cgstPercent ?? rate / 2,
      sgstPercent: payload.sgstPercent ?? rate / 2,
      igstPercent: payload.igstPercent ?? rate,
      effectiveFrom: payload.effectiveFrom ? new Date(payload.effectiveFrom) : new Date()
    });

    await CacheService.bust('tax-created', [CACHE.taxRates()]);
    return decimalise(row, ['ratePercent', 'cgstPercent', 'sgstPercent', 'igstPercent', 'cessPercent']);
  }

  static async resolveTaxForHsn(hsnCode) {
    const row = await LookupRepository.taxRateByHsn(hsnCode);
    if (!row) throw ApiError.notFound(`No active tax rate configured for HSN ${hsnCode}`);
    return decimalise(row, ['ratePercent', 'cgstPercent', 'sgstPercent', 'igstPercent', 'cessPercent']);
  }

  /** Computes an interstate or intrastate GST breakup for a line amount. */
  static async computeTax({ taxRateId, amount, interState = false }) {
    const tax = await LookupRepository.taxRateById(taxRateId);
    if (!tax) throw ApiError.notFound('Tax rate not found');

    const cess = (amount * Number(tax.cessPercent)) / 100;

    if (interState) {
      const igst = (amount * Number(tax.igstPercent)) / 100;
      return {
        taxable: amount,
        igst: Number(igst.toFixed(2)),
        cgst: 0,
        sgst: 0,
        cess: Number(cess.toFixed(2)),
        totalTax: Number((igst + cess).toFixed(2)),
        grandTotal: Number((amount + igst + cess).toFixed(2))
      };
    }

    const cgst = (amount * Number(tax.cgstPercent)) / 100;
    const sgst = (amount * Number(tax.sgstPercent)) / 100;

    return {
      taxable: amount,
      igst: 0,
      cgst: Number(cgst.toFixed(2)),
      sgst: Number(sgst.toFixed(2)),
      cess: Number(cess.toFixed(2)),
      totalTax: Number((cgst + sgst + cess).toFixed(2)),
      grandTotal: Number((amount + cgst + sgst + cess).toFixed(2))
    };
  }
}

module.exports = LookupService;
