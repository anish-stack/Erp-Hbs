'use strict';

function round(v, dp) { const f = 10 ** dp; return Math.round((Number(v) + Number.EPSILON) * f) / f; }

/** Computes a single line total: qty * price, less discount%, plus tax%. */
function computeLine(line) {
  const qty = Number(line.quantity);
  const price = Number(line.unitPrice);
  const gross = qty * price;
  const discount = gross * (Number(line.discountPct || 0) / 100);
  const net = gross - discount;
  const tax = net * (Number(line.taxRatePct || 0) / 100);
  return {
    gross: round(gross, 2),
    discount: round(discount, 2),
    net: round(net, 2),
    tax: round(tax, 2),
    lineTotal: round(net + tax, 2)
  };
}

/** Rolls line computations into document totals. */
function computeTotals(lines) {
  return lines.reduce(
    (acc, line) => {
      const c = computeLine(line);
      acc.subtotal = round(acc.subtotal + c.net, 2);
      acc.discountTotal = round(acc.discountTotal + c.discount, 2);
      acc.taxTotal = round(acc.taxTotal + c.tax, 2);
      acc.grandTotal = round(acc.grandTotal + c.lineTotal, 2);
      return acc;
    },
    { subtotal: 0, discountTotal: 0, taxTotal: 0, grandTotal: 0 }
  );
}

module.exports = { round, computeLine, computeTotals };
