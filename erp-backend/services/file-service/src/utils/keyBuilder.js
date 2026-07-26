'use strict';

const path = require('path');
const { randomUUID } = require('crypto');

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Builds a collision-proof, human-readable object key:
 *   purchase/2026/07/9f1c2a3e-invoice-2026-0142.pdf
 */
function buildKey({ originalName, entity = null, category = 'other' }) {
  const extension = path.extname(originalName).toLowerCase();
  const base = slugify(path.basename(originalName, extension)) || 'file';

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const scope = slugify(entity || category.toLowerCase());
  const fileName = `${randomUUID()}-${base}${extension}`;

  return { key: `${scope}/${year}/${month}/${fileName}`, fileName, extension };
}

/** Variant keys live beside the original: <key-without-ext>_480.webp */
function variantKey(originalKey, suffix, extension = '.webp') {
  const withoutExtension = originalKey.replace(/\.[^./]+$/, '');
  return `${withoutExtension}_${suffix}${extension}`;
}

module.exports = { buildKey, variantKey, slugify };
