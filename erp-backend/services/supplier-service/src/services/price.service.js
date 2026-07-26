'use strict';

const { ApiError, utils, cache } = require('@erp/shared');
const PriceRepository = require('../repositories/price.repository');
const SupplierRepository = require('../repositories/supplier.repository');
const MasterClient = require('../clients/master.client');
const publisher = require('../events/publisher');
const { CACHE, SUPPLIER_STATUS } = require('../constants');

function decimal(value) {
  return value === null || value === undefined ? null : String(value);
}

function shape(price) {
  return {
    id: price.id,
    supplierId: price.supplierId,
    supplier: price.supplier || undefined,
    partId: price.partId,
    supplierPartNumber: price.supplierPartNumber,
    moq: price.moq,
    packQuantity: price.packQuantity,
    unitPrice: decimal(price.unitPrice),
    currencyCode: price.currencyCode,
    discountPercent: decimal(price.discountPercent),
    netPrice: decimal(
      Number(price.unitPrice) * (1 - Number(price.discountPercent || 0) / 100)
    ),
    leadTimeDays: price.leadTimeDays,
    stockQuantity: price.stockQuantity,
    validFrom: price.validFrom,
    validTo: price.validTo,
    isPreferred: price.isPreferred,
    isActive: price.isActive,
    source: price.source,
    notes: price.notes,
    updatedAt: price.updatedAt
  };
}

class PriceService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['unitPrice', 'moq', 'updatedAt', 'validFrom'],
      defaultSortField: 'updatedAt'
    });

    const where = {
      deletedAt: null,
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.partId ? { partId: query.partId } : {}),
      ...(query.currencyCode ? { currencyCode: query.currencyCode } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search ? { supplierPartNumber: { contains: query.search } } : {})
    };

    const { items, total } = await PriceRepository.paginate({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy
    });

    return { items: items.map(shape), total, page: pagination.page, limit: pagination.limit };
  }

  static async upsert(supplierId, payload, user) {
    const supplier = await SupplierRepository.findById(supplierId);
    if (!supplier) throw ApiError.notFound('Supplier not found');

    const part = await MasterClient.getPart(payload.partId, user).catch(() => null);
    if (!part) throw ApiError.badRequest('Part not found in the master data', { field: 'partId' });

    const price = await PriceRepository.create({
      supplierId,
      partId: payload.partId,
      supplierPartNumber: payload.supplierPartNumber || null,
      moq: payload.moq ?? 1,
      packQuantity: payload.packQuantity ?? 1,
      unitPrice: payload.unitPrice,
      currencyCode: payload.currencyCode || supplier.currencyCode,
      discountPercent: payload.discountPercent ?? 0,
      leadTimeDays: payload.leadTimeDays ?? supplier.defaultLeadTime ?? null,
      stockQuantity: payload.stockQuantity ?? null,
      validFrom: payload.validFrom ? new Date(payload.validFrom) : new Date(),
      validTo: payload.validTo ? new Date(payload.validTo) : null,
      isPreferred: payload.isPreferred === true,
      source: payload.source || 'MANUAL',
      notes: payload.notes || null,
      createdBy: user.id,
      updatedBy: user.id
    });

    await cache.del(CACHE.bestPrice(payload.partId));
    await publisher.priceUpdated(supplierId, [payload.partId], user.id);

    return shape(price);
  }

  /** Replaces a supplier's entire catalogue in one transaction. */
  static async bulkReplace(supplierId, rows, user) {
    const supplier = await SupplierRepository.findById(supplierId);
    if (!supplier) throw ApiError.notFound('Supplier not found');

    const { missing } = await MasterClient.verifyParts(rows.map((row) => row.partId), user);
    if (missing.length) {
      throw ApiError.badRequest('Some parts do not exist in the master data', {
        missingPartIds: missing.slice(0, 20),
        missingCount: missing.length
      });
    }

    const prepared = rows.map((row) => ({
      supplierId,
      partId: row.partId,
      supplierPartNumber: row.supplierPartNumber || null,
      moq: row.moq ?? 1,
      packQuantity: row.packQuantity ?? 1,
      unitPrice: row.unitPrice,
      currencyCode: row.currencyCode || supplier.currencyCode,
      discountPercent: row.discountPercent ?? 0,
      leadTimeDays: row.leadTimeDays ?? supplier.defaultLeadTime ?? null,
      stockQuantity: row.stockQuantity ?? null,
      validFrom: row.validFrom ? new Date(row.validFrom) : new Date(),
      validTo: row.validTo ? new Date(row.validTo) : null,
      isPreferred: row.isPreferred === true,
      source: row.source || 'IMPORT',
      createdBy: user.id,
      updatedBy: user.id
    }));

    const count = await PriceRepository.replaceForSupplier(supplierId, prepared);

    const partIds = [...new Set(rows.map((row) => row.partId))];
    await Promise.all(partIds.map((partId) => cache.del(CACHE.bestPrice(partId))));
    await publisher.priceUpdated(supplierId, partIds, user.id);

    return { supplierId, replaced: count, parts: partIds.length };
  }

  static async update(priceId, payload, user) {
    const price = await PriceRepository.findById(priceId);
    if (!price) throw ApiError.notFound('Price entry not found');

    const updated = await PriceRepository.update(priceId, { ...payload, updatedBy: user.id });

    await cache.del(CACHE.bestPrice(price.partId));
    await publisher.priceUpdated(price.supplierId, [price.partId], user.id);

    return shape(updated);
  }

  static async remove(priceId) {
    const price = await PriceRepository.findById(priceId);
    if (!price) throw ApiError.notFound('Price entry not found');

    await PriceRepository.softDelete(priceId);
    await cache.del(CACHE.bestPrice(price.partId));

    return { deleted: true };
  }

  /**
   * Sourcing comparison for one part: every live quote, ranked, with the
   * cheapest and the fastest highlighted. This is what RFQ and Purchase use.
   */
  static async compare(partId, { quantity = 1, includeUnapproved = false } = {}) {
    const quotes = await PriceRepository.quotesForPart(partId, {
      quantity,
      onlyApproved: !includeUnapproved
    });

    if (!quotes.length) {
      return {
        partId,
        quantity,
        count: 0,
        quotes: [],
        message: 'No supplier currently quotes this part at the requested quantity'
      };
    }

    const enriched = quotes.map((quote) => {
      const net = Number(quote.unitPrice) * (1 - Number(quote.discountPercent || 0) / 100);
      return {
        ...shape(quote),
        netUnitPrice: Number(net.toFixed(4)),
        extendedPrice: Number((net * quantity).toFixed(2)),
        supplierApproved: quote.supplier.status === SUPPLIER_STATUS.APPROVED,
        supplierRating: decimal(quote.supplier.overallRating)
      };
    });

    const cheapest = enriched.reduce((best, item) =>
      item.netUnitPrice < best.netUnitPrice ? item : best
    );
    const fastest = enriched
      .filter((item) => item.leadTimeDays !== null)
      .reduce((best, item) => (!best || item.leadTimeDays < best.leadTimeDays ? item : best), null);

    return {
      partId,
      quantity,
      count: enriched.length,
      cheapestSupplierId: cheapest.supplierId,
      fastestSupplierId: fastest ? fastest.supplierId : null,
      priceSpreadPercent: Number(
        (
          ((Math.max(...enriched.map((item) => item.netUnitPrice)) - cheapest.netUnitPrice) /
            cheapest.netUnitPrice) *
          100
        ).toFixed(2)
      ),
      quotes: enriched
    };
  }

  static async partsOf(supplierId) {
    return PriceRepository.partIdsForSupplier(supplierId);
  }

  static shape = shape;
}

module.exports = PriceService;
