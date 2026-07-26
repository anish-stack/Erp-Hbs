'use strict';

/**
 * Electronic part numbers are written inconsistently across suppliers:
 *   "LM317T", "lm-317 t", "LM 317/T" all mean the same device.
 * Normalising to an uppercase, punctuation-free form makes search and
 * uniqueness checks behave the way a purchase executive expects.
 */
function normalize(partNumber) {
  return String(partNumber || '')
    .toUpperCase()
    .replace(/[\s\-_./\\,()[\]]+/g, '')
    .trim();
}

/** Common packaging/tolerance suffixes that buyers often omit. */
const TRAILING_SUFFIXES = ['TR', 'T&R', 'REEL', 'CT', 'CUT', 'TAPE', 'BULK', 'TUBE'];

function stripPackagingSuffix(normalized) {
  for (const suffix of TRAILING_SUFFIXES) {
    const cleaned = suffix.replace(/[^A-Z0-9]/g, '');
    if (normalized.length > cleaned.length + 2 && normalized.endsWith(cleaned)) {
      return normalized.slice(0, -cleaned.length);
    }
  }
  return normalized;
}

/** Builds the candidate forms used for tolerant lookup, widest last. */
function searchVariants(input) {
  const normalized = normalize(input);
  const variants = new Set([normalized]);

  const stripped = stripPackagingSuffix(normalized);
  if (stripped !== normalized) variants.add(stripped);

  return Array.from(variants).filter(Boolean);
}

function isLikelyPartNumber(value) {
  const normalized = normalize(value);
  return normalized.length >= 3 && /\d/.test(normalized) && /[A-Z]/.test(normalized);
}

module.exports = { normalize, searchVariants, stripPackagingSuffix, isLikelyPartNumber };
