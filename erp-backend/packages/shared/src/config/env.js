'use strict';

const path = require('path');
const fs = require('fs');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function load(serviceRoot = process.cwd()) {
  const candidates = [
    path.resolve(serviceRoot, '.env'),
    path.resolve(serviceRoot, '../../.env')
  ];
  for (const file of candidates) {
    const parsed = parseEnvFile(file);
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
  return process.env;
}

function required(key) {
  const value = process.env[key];
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function requireAll(keys = []) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  return true;
}

function str(key, fallback = '') {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

function int(key, fallback = 0) {
  const value = parseInt(process.env[key], 10);
  return Number.isNaN(value) ? fallback : value;
}

function bool(key, fallback = false) {
  const value = process.env[key];
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function list(key, fallback = []) {
  const value = process.env[key];
  if (!value) return fallback;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function isProd() {
  return str('NODE_ENV', 'development') === 'production';
}

module.exports = { load, required, requireAll, str, int, bool, list, isProd, parseEnvFile };
