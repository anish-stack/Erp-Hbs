'use strict';

const { ApiError, logger } = require('@erp/shared');
const SequenceRepository = require('../repositories/sequence.repository');

function periodKeyFor(policy, date = new Date()) {
  if (policy === 'MONTHLY') {
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  if (policy === 'YEARLY') return String(date.getFullYear());
  return 'ALL';
}

function format(sequence, value, date = new Date()) {
  const parts = [sequence.prefix];

  if (sequence.includeYear) parts.push(String(date.getFullYear()));
  if (sequence.includeMonth) parts.push(String(date.getMonth() + 1).padStart(2, '0'));

  parts.push(String(value).padStart(sequence.padding, '0'));
  if (sequence.suffix) parts.push(sequence.suffix);

  return parts.join(sequence.separator);
}

class SequenceService {
  static async list() {
    return SequenceRepository.all();
  }

  static async get(key) {
    const sequence = await SequenceRepository.findByKey(key);
    if (!sequence) throw ApiError.notFound(`Sequence "${key}" is not configured`);
    return sequence;
  }

  /**
   * Issues one or more document numbers.
   * Callers receive fully formatted values such as "PO-2026-0142".
   */
  static async next(key, count = 1, actorId = null) {
    const sequence = await SequenceService.get(key);
    const periodKey = periodKeyFor(sequence.resetPolicy);

    const reserved = await SequenceRepository.reserve(key, count, periodKey);
    if (!reserved) throw ApiError.badRequest(`Sequence "${key}" is inactive`);

    const numbers = [];
    for (let index = 0; index < count; index += 1) {
      numbers.push(format(sequence, reserved.start + reserved.step * index));
    }

    logger.info('Issued %d number(s) from sequence %s for %s', count, key, actorId || 'system');

    return {
      key,
      numbers,
      first: numbers[0],
      last: numbers[numbers.length - 1],
      periodKey,
      resetApplied: reserved.reset
    };
  }

  /** Shows what the next number would look like without consuming it. */
  static async preview(key) {
    const sequence = await SequenceService.get(key);
    const periodKey = periodKeyFor(sequence.resetPolicy);
    const wouldReset = sequence.resetPolicy !== 'NEVER' && sequence.periodKey !== periodKey;

    return {
      key,
      preview: format(sequence, wouldReset ? 1 : sequence.nextValue),
      nextValue: wouldReset ? 1 : sequence.nextValue,
      resetPending: wouldReset,
      resetPolicy: sequence.resetPolicy
    };
  }

  static async create(payload) {
    const existing = await SequenceRepository.findByKey(payload.key);
    if (existing) throw ApiError.conflict('A sequence with this key already exists', { field: 'key' });

    return SequenceRepository.create({
      ...payload,
      periodKey: periodKeyFor(payload.resetPolicy || 'YEARLY')
    });
  }

  static async update(key, payload) {
    await SequenceService.get(key);

    if (payload.nextValue !== undefined) {
      const current = await SequenceRepository.findByKey(key);
      if (payload.nextValue < current.nextValue) {
        throw ApiError.badRequest(
          'Sequence counters can only move forward, never backwards',
          { current: current.nextValue, requested: payload.nextValue }
        );
      }
    }

    return SequenceRepository.update(key, payload);
  }

  static format = format;
  static periodKeyFor = periodKeyFor;
}

module.exports = SequenceService;
