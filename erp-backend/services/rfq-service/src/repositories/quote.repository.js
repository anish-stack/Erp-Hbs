'use strict';

const { prisma } = require('../config/prisma');

class QuoteRepository {
  static async create(data, lines) {
    return prisma.rfqQuote.create({
      data: { ...data, lines: { create: lines } },
      include: { lines: true }
    });
  }

  static async findByRfqSupplier(rfqSupplierId) {
    return prisma.rfqQuote.findUnique({ where: { rfqSupplierId }, include: { lines: true } });
  }

  static async findById(id) {
    return prisma.rfqQuote.findUnique({ where: { id }, include: { lines: true } });
  }

  /** Every quote line across every supplier for one RFQ, for the comparison sheet. */
  static async linesForRfq(rfqId) {
    return prisma.rfqQuoteLine.findMany({
      where: { quote: { rfqId } },
      include: {
        quote: {
          include: { rfqSupplier: { select: { supplierId: true, supplierCode: true, supplierName: true } } }
        },
        rfqLine: { select: { id: true, lineNumber: true, partId: true, partNumber: true, quantity: true } }
      }
    });
  }
}

module.exports = QuoteRepository;
