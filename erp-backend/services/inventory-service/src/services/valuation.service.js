'use strict';

/**
 * Numeric helpers for inventory maths. Quantities are rounded to 3 dp,
 * unit costs to 4 dp and monetary values to 2 dp, matching the Prisma
 * Decimal precisions. Prisma accepts JS numbers for Decimal columns.
 */
const QTY_DP = 3;
const COST_DP = 4;
const VALUE_DP = 2;

function round(value, dp) {
  const factor = 10 ** dp;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

const qty = (v) => round(v, QTY_DP);
const cost = (v) => round(v, COST_DP);
const money = (v) => round(v, VALUE_DP);

/**
 * Moving-average cost after an inbound movement.
 * newAvg = (onHand*avgCost + inQty*inCost) / (onHand + inQty)
 */
function movingAverage({ onHand, avgCost, inQty, inCost }) {
  const currentValue = Number(onHand) * Number(avgCost);
  const addedValue = Number(inQty) * Number(inCost);
  const newQty = Number(onHand) + Number(inQty);
  if (newQty <= 0) return cost(inCost);
  return cost((currentValue + addedValue) / newQty);
}

module.exports = { round, qty, cost, money, movingAverage, QTY_DP, COST_DP, VALUE_DP };
