'use strict';

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

/** Converts 0-999 into words. */
function threeDigits(n) {
  let str = '';

  if (n >= 100) {
    str += `${ONES[Math.floor(n / 100)]} Hundred`;
    n %= 100;
    if (n) str += ' ';
  }

  if (n >= 20) {
    str += TENS[Math.floor(n / 10)];
    if (n % 10) str += `-${ONES[n % 10]}`;
  } else if (n > 0) {
    str += ONES[n];
  }

  return str;
}

/** Converts an integer (Indian numbering: Crore/Lakh/Thousand) into words. */
function integerToWords(num) {
  if (num === 0) return 'Zero';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = num;

  const parts = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  return parts.join(' ');
}

/**
 * Converts a rupee amount (number or numeric string, may include paise)
 * into words, Indian format. e.g. 125893.25 -> "One Lakh Twenty-Five
 * Thousand Eight Hundred Ninety-Three Rupees and Twenty-Five Paise Only"
 */
function toWords(amount) {
  const value = Number(amount || 0);
  const rupees = Math.floor(value);
  const paise = Math.round((value - rupees) * 100);

  let words = `${integerToWords(rupees)} Rupees`;

  if (paise > 0) {
    words += ` and ${integerToWords(paise)} Paise`;
  }

  return `${words} Only`;
}

module.exports = { toWords };