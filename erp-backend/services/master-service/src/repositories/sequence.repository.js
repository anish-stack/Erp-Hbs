'use strict';

const { prisma } = require('../config/prisma');

class SequenceRepository {
  static async all() {
    return prisma.numberSequence.findMany({ orderBy: { key: 'asc' } });
  }

  static async findByKey(key) {
    return prisma.numberSequence.findUnique({ where: { key } });
  }

  static async create(data) {
    return prisma.numberSequence.create({ data });
  }

  static async update(key, data) {
    return prisma.numberSequence.update({ where: { key }, data });
  }

  /**
   * Reserves `count` numbers atomically.
   * The row is locked with SELECT ... FOR UPDATE so two concurrent purchase
   * orders can never receive the same document number.
   */
  static async reserve(key, count, periodKey) {
    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw`
        SELECT id, nextValue, step, periodKey, resetPolicy
        FROM number_sequences
        WHERE \`key\` = ${key} AND isActive = true
        FOR UPDATE
      `;

      if (!rows.length) return null;

      const sequence = rows[0];
      const resetNeeded = sequence.resetPolicy !== 'NEVER' && sequence.periodKey !== periodKey;
      const start = resetNeeded ? 1 : Number(sequence.nextValue);
      const step = Number(sequence.step) || 1;
      const nextValue = start + step * count;

      await tx.numberSequence.update({
        where: { key },
        data: { nextValue, periodKey }
      });

      return { start, step, count, nextValue, reset: resetNeeded };
    });
  }
}

module.exports = SequenceRepository;
