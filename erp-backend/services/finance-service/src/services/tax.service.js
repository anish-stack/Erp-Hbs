'use strict';

const config = require('../config');

function round(v, dp = 2) { const f = 10 ** dp; return Math.round((Number(v) + Number.EPSILON) * f) / f; }

/**
 * Computes a GST invoice line. Intra-state supply splits the tax into CGST+SGST
 * (half each); inter-state supply charges IGST (full rate).
 */
function computeLine(line, interState) {
  const qty = Number(line.quantity);
  const price = Number(line.unitPrice);
  const gross = qty * price;
  const discount = gross * (Number(line.discountPct || 0) / 100);
  const taxable = round(gross - discount);
  const rate = Number(line.taxRatePct || 0);
  const taxAmount = round(taxable * (rate / 100));

  let cgst = 0, sgst = 0, igst = 0;
  if (interState) {
    igst = taxAmount;
  } else {
    cgst = round(taxAmount / 2);
    sgst = round(taxAmount - cgst); // absorb rounding remainder into sgst
  }

  return {
    taxableValue: taxable,
    discount: round(discount),
    cgst, sgst, igst,
    taxAmount,
    lineTotal: round(taxable + taxAmount)
  };
}

/** Determines inter-state supply by comparing buyer place-of-supply to seller state. */
function isInterState(placeOfSupply) {
  if (!placeOfSupply) return false;
  return String(placeOfSupply).trim() !== String(config.sellerStateCode).trim();
}

/** Rolls line computations into invoice totals with rupee round-off. */
function computeInvoice(rawLines, placeOfSupply) {
  const interState = isInterState(placeOfSupply);
  const lines = rawLines.map((l) => {
    const c = computeLine(l, interState);
    return {
      ...l,
      taxableValue: c.taxableValue,
      cgst: c.cgst, sgst: c.sgst, igst: c.igst,
      lineTotal: c.lineTotal
    };
  });

  const totals = lines.reduce((acc, l) => {
    acc.subtotal = round(acc.subtotal + Number(l.quantity) * Number(l.unitPrice));
    acc.taxableTotal = round(acc.taxableTotal + l.taxableValue);
    acc.cgstTotal = round(acc.cgstTotal + l.cgst);
    acc.sgstTotal = round(acc.sgstTotal + l.sgst);
    acc.igstTotal = round(acc.igstTotal + l.igst);
    acc.grandRaw = round(acc.grandRaw + l.lineTotal);
    return acc;
  }, { subtotal: 0, taxableTotal: 0, cgstTotal: 0, sgstTotal: 0, igstTotal: 0, grandRaw: 0 });

  const discountTotal = round(totals.subtotal - totals.taxableTotal);
  const taxTotal = round(totals.cgstTotal + totals.sgstTotal + totals.igstTotal);
  const grandRounded = Math.round(totals.grandRaw);
  const roundOff = round(grandRounded - totals.grandRaw);

  return {
    interState,
    lines,
    totals: {
      subtotal: totals.subtotal,
      discountTotal,
      taxableTotal: totals.taxableTotal,
      cgstTotal: totals.cgstTotal,
      sgstTotal: totals.sgstTotal,
      igstTotal: totals.igstTotal,
      taxTotal,
      roundOff,
      grandTotal: grandRounded
    }
  };
}

module.exports = { round, computeLine, isInterState, computeInvoice };
