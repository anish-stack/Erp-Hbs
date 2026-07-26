'use strict';

function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Builds a CSV buffer (no external dependency needed). */
function buildCsv({ columns, rows, getValue }) {
  const header = columns.map((c) => escapeCell(c.header)).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCell(getValue(row, c.key))).join(','));
  return Buffer.from([header, ...lines].join('\r\n'), 'utf8');
}

module.exports = { buildCsv };
