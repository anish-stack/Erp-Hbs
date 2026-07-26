'use strict';

const { ApiError, cache } = require('@erp/shared');
const RatingRepository = require('../repositories/rating.repository');
const SupplierRepository = require('../repositories/supplier.repository');
const publisher = require('../events/publisher');
const config = require('../config');
const { CACHE } = require('../constants');

const WEIGHTS = config.rating.weights;

function gradeOf(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'E';
}

function riskOf(score) {
  if (score >= 75) return 'LOW';
  if (score >= 50) return 'MEDIUM';
  return 'HIGH';
}

function weightedOverall(scores) {
  return Number(
    (
      scores.onTimeDeliveryScore * WEIGHTS.onTimeDelivery +
      scores.qualityScore * WEIGHTS.quality +
      scores.priceScore * WEIGHTS.price +
      scores.responsivenessScore * WEIGHTS.responsiveness +
      scores.complianceScore * WEIGHTS.compliance
    ).toFixed(2)
  );
}

/** Turns raw counters into 0-100 sub-scores. */
function scoresFromPerformance(performance) {
  const delivery = performance.ordersPlaced
    ? (performance.ordersOnTime / performance.ordersPlaced) * 100
    : 0;

  const quality = performance.lotsReceived
    ? (performance.lotsAccepted / performance.lotsReceived) * 100
    : 0;

  const responsiveness = performance.quotesRequested
    ? (performance.quotesAnswered / performance.quotesRequested) * 100
    : 0;

  return {
    onTimeDeliveryScore: Number(delivery.toFixed(2)),
    qualityScore: Number(quality.toFixed(2)),
    responsivenessScore: Number(responsiveness.toFixed(2))
  };
}

class RatingService {
  static async history(supplierId) {
    await SupplierRepository.findById(supplierId).then((row) => {
      if (!row) throw ApiError.notFound('Supplier not found');
    });

    const ratings = await RatingRepository.listForSupplier(supplierId);
    const performance = await RatingRepository.performance(supplierId);

    return {
      supplierId,
      currentPeriod: performance
        ? { ...performance, derivedScores: scoresFromPerformance(performance) }
        : null,
      history: ratings.map((rating) => ({
        periodStart: rating.periodStart,
        periodEnd: rating.periodEnd,
        onTimeDeliveryScore: String(rating.onTimeDeliveryScore),
        qualityScore: String(rating.qualityScore),
        priceScore: String(rating.priceScore),
        responsivenessScore: String(rating.responsivenessScore),
        complianceScore: String(rating.complianceScore),
        overallScore: String(rating.overallScore),
        grade: rating.grade,
        ordersPlaced: rating.ordersPlaced,
        lotsRejected: rating.lotsRejected,
        remarks: rating.remarks
      }))
    };
  }

  /** Manual evaluation: an executive supplies the subjective scores. */
  static async evaluate(supplierId, payload, user) {
    const supplier = await SupplierRepository.findById(supplierId);
    if (!supplier) throw ApiError.notFound('Supplier not found');

    const performance = (await RatingRepository.performance(supplierId)) || {
      ordersPlaced: 0,
      ordersOnTime: 0,
      lotsReceived: 0,
      lotsAccepted: 0,
      lotsRejected: 0,
      quotesRequested: 0,
      quotesAnswered: 0
    };

    const derived = scoresFromPerformance(performance);

    const scores = {
      onTimeDeliveryScore: payload.onTimeDeliveryScore ?? derived.onTimeDeliveryScore,
      qualityScore: payload.qualityScore ?? derived.qualityScore,
      responsivenessScore: payload.responsivenessScore ?? derived.responsivenessScore,
      priceScore: payload.priceScore ?? 0,
      complianceScore: payload.complianceScore ?? 0
    };

    const overallScore = weightedOverall(scores);
    const grade = gradeOf(overallScore);

    const periodStart = new Date(payload.periodStart);
    const periodEnd = new Date(payload.periodEnd);

    if (periodEnd <= periodStart) {
      throw ApiError.badRequest('periodEnd must be after periodStart');
    }

    const rating = await RatingRepository.upsertPeriod(supplierId, periodStart, periodEnd, {
      ...scores,
      overallScore,
      grade,
      ordersPlaced: performance.ordersPlaced,
      ordersOnTime: performance.ordersOnTime,
      lotsReceived: performance.lotsReceived,
      lotsRejected: performance.lotsRejected,
      remarks: payload.remarks || null,
      evaluatedBy: user.id
    });

    await SupplierRepository.update(
      supplierId,
      { overallRating: overallScore, lastEvaluatedAt: new Date(), riskLevel: riskOf(overallScore) },
      user.id
    );

    if (payload.resetCounters !== false && performance.ordersPlaced) {
      await RatingRepository.resetPerformance(supplierId).catch(() => {});
    }

    await cache.del(CACHE.supplier(supplierId), CACHE.options());
    await publisher.rated(supplier, rating, user.id);

    return {
      supplierId,
      periodStart,
      periodEnd,
      scores,
      overallScore,
      grade,
      riskLevel: riskOf(overallScore),
      basedOn: performance
    };
  }

  static async leaderboard() {
    const rows = await RatingRepository.leaderboard();
    return rows.map((row) => ({
      ...row,
      overallRating: String(row.overallRating),
      grade: gradeOf(Number(row.overallRating))
    }));
  }

  /** Called by the event consumers as purchase and quality outcomes arrive. */
  static async recordEvent(supplierId, increments, lastOrderAt = null) {
    return RatingRepository.bumpPerformance(supplierId, increments, lastOrderAt);
  }

  static gradeOf = gradeOf;
  static riskOf = riskOf;
  static weightedOverall = weightedOverall;
  static scoresFromPerformance = scoresFromPerformance;
}

module.exports = RatingService;
