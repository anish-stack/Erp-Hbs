'use strict';

const xss = require('xss');

const XSS_OPTIONS = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style']
};

function cleanValue(value) {
  if (typeof value === 'string') return xss(value, XSS_OPTIONS).trim();
  if (Array.isArray(value)) return value.map(cleanValue);
  if (value && typeof value === 'object') return cleanObject(value);
  return value;
}

function cleanObject(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    out[key] = cleanValue(value);
  }
  return out;
}

module.exports = { cleanValue, cleanObject };
