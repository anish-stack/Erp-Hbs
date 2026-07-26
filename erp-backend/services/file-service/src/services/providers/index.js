'use strict';

const { logger } = require('@erp/shared');
const config = require('../../config');
const { STORAGE_KIND } = require('../../constants');
const LocalProvider = require('./LocalProvider');
const R2Provider = require('./R2Provider');
const CloudinaryProvider = require('./CloudinaryProvider');

const REGISTRY = {
  [STORAGE_KIND.R2]: R2Provider,
  [STORAGE_KIND.CLOUDINARY]: CloudinaryProvider,
  [STORAGE_KIND.LOCAL]: LocalProvider
};

/** Preference order when STORAGE_PROVIDER=auto. */
const PRIORITY = [STORAGE_KIND.R2, STORAGE_KIND.CLOUDINARY, STORAGE_KIND.LOCAL];

const ALIASES = {
  r2: STORAGE_KIND.R2,
  cloudflare: STORAGE_KIND.R2,
  cloudinary: STORAGE_KIND.CLOUDINARY,
  local: STORAGE_KIND.LOCAL,
  disk: STORAGE_KIND.LOCAL
};

const instances = new Map();

function resolveKind() {
  const preference = config.storage.preference;

  if (preference && preference !== 'auto') {
    const kind = ALIASES[preference] || preference.toUpperCase();
    const Provider = REGISTRY[kind];

    if (!Provider) throw new Error(`Unknown STORAGE_PROVIDER "${preference}"`);
    if (!Provider.isConfigured()) {
      throw new Error(`STORAGE_PROVIDER is "${preference}" but its credentials are missing`);
    }
    return kind;
  }

  for (const kind of PRIORITY) {
    if (REGISTRY[kind].isConfigured()) return kind;
  }

  return STORAGE_KIND.LOCAL;
}

/** Returns the active provider (singleton per kind). */
function getProvider(kind = null) {
  const target = kind || resolveKind();

  if (!instances.has(target)) {
    const Provider = REGISTRY[target];
    if (!Provider) throw new Error(`Unknown storage provider "${target}"`);
    instances.set(target, new Provider());
    logger.info('Storage provider initialised: %s', target);
  }

  return instances.get(target);
}

/** Reads still work for files written by a previously active provider. */
function getProviderFor(file) {
  return getProvider(file.provider);
}

function activeKind() {
  return resolveKind();
}

function availability() {
  return PRIORITY.map((kind) => ({
    provider: kind,
    configured: REGISTRY[kind].isConfigured(),
    active: kind === resolveKind()
  }));
}

module.exports = { getProvider, getProviderFor, activeKind, availability, resolveKind, REGISTRY };
