'use strict';

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const CIN_PATTERN = /^[LUu]{1}[0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}$/;

const GST_CHECKSUM_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Indian state codes embedded in the first two GSTIN digits. */
const STATE_CODES = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  10: 'Bihar', 11: 'Sikkim', 12: 'Arunachal Pradesh', 13: 'Nagaland', 14: 'Manipur',
  15: 'Mizoram', 16: 'Tripura', 17: 'Meghalaya', 18: 'Assam', 19: 'West Bengal',
  20: 'Jharkhand', 21: 'Odisha', 22: 'Chhattisgarh', 23: 'Madhya Pradesh', 24: 'Gujarat',
  27: 'Maharashtra', 29: 'Karnataka', 30: 'Goa', 31: 'Lakshadweep', 32: 'Kerala',
  33: 'Tamil Nadu', 34: 'Puducherry', 35: 'Andaman and Nicobar Islands', 36: 'Telangana',
  37: 'Andhra Pradesh', 38: 'Ladakh'
};

/** Verifies the GSTIN modulus-36 check digit, not just the shape. */
function gstinChecksum(gstin) {
  const body = gstin.slice(0, 14);
  const provided = gstin[14];

  let sum = 0;
  for (let index = 0; index < body.length; index += 1) {
    const value = GST_CHECKSUM_ALPHABET.indexOf(body[index]);
    if (value === -1) return false;

    const factor = index % 2 === 0 ? 1 : 2;
    const product = value * factor;
    sum += Math.floor(product / 36) + (product % 36);
  }

  const expected = GST_CHECKSUM_ALPHABET[(36 - (sum % 36)) % 36];
  return expected === provided;
}

function validateGstin(gstin) {
  if (!gstin) return { valid: true, skipped: true };

  const value = String(gstin).toUpperCase().trim();

  if (!GSTIN_PATTERN.test(value)) {
    return { valid: false, reason: 'GSTIN format is invalid' };
  }

  const stateCode = value.slice(0, 2);
  if (!STATE_CODES[stateCode]) {
    return { valid: false, reason: `Unknown state code "${stateCode}" in GSTIN` };
  }

  if (!gstinChecksum(value)) {
    return { valid: false, reason: 'GSTIN check digit does not match' };
  }

  return {
    valid: true,
    normalized: value,
    stateCode,
    state: STATE_CODES[stateCode],
    /// Digits 3-12 of a GSTIN are the holder's PAN.
    pan: value.slice(2, 12)
  };
}

function validatePan(pan) {
  if (!pan) return { valid: true, skipped: true };
  const value = String(pan).toUpperCase().trim();
  return PAN_PATTERN.test(value)
    ? { valid: true, normalized: value, entityType: value[3] }
    : { valid: false, reason: 'PAN format is invalid' };
}

function validateIfsc(ifsc) {
  if (!ifsc) return { valid: true, skipped: true };
  const value = String(ifsc).toUpperCase().trim();
  return IFSC_PATTERN.test(value)
    ? { valid: true, normalized: value, bankCode: value.slice(0, 4) }
    : { valid: false, reason: 'IFSC format is invalid' };
}

function validateCin(cin) {
  if (!cin) return { valid: true, skipped: true };
  const value = String(cin).toUpperCase().trim();
  return CIN_PATTERN.test(value)
    ? { valid: true, normalized: value }
    : { valid: false, reason: 'CIN format is invalid' };
}

/** Bank account numbers are only ever returned masked. */
function maskAccountNumber(accountNumber) {
  const value = String(accountNumber || '');
  if (value.length <= 4) return '*'.repeat(value.length);
  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
}

module.exports = {
  validateGstin,
  validatePan,
  validateIfsc,
  validateCin,
  maskAccountNumber,
  gstinChecksum,
  STATE_CODES
};
