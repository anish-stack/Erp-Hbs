'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { logger } = require('@erp/shared');
const StorageProvider = require('./StorageProvider');
const config = require('../../config');
const { STORAGE_KIND, VISIBILITY } = require('../../constants');

/** Development provider. Signed URLs are HMAC tokens verified by this service. */
class LocalProvider extends StorageProvider {
  constructor() {
    super(STORAGE_KIND.LOCAL);
    this.root = config.local.root;
    if (!fs.existsSync(this.root)) fs.mkdirSync(this.root, { recursive: true });
  }

  static isConfigured() {
    return true;
  }

  resolve(key) {
    if (!key || key.includes('\0') || key.split(/[/\\]/).includes('..')) {
      throw new Error('Path traversal attempt blocked');
    }

    const safe = path.normalize(key).replace(/^[/\\]+/, '');
    const full = path.join(this.root, safe);

    if (!full.startsWith(this.root + path.sep)) throw new Error('Path traversal attempt blocked');
    return full;
  }

  async put({ buffer, key, mimeType, visibility }) {
    const target = this.resolve(key);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await fs.promises.writeFile(target, buffer);

    logger.info('Stored %s locally (%d bytes)', key, buffer.length);

    return {
      key,
      provider: this.kind,
      bucket: null,
      size: buffer.length,
      mimeType,
      publicUrl: visibility === VISIBILITY.PUBLIC ? this.publicUrl(key) : null
    };
  }

  async getStream(key) {
    const target = this.resolve(key);
    if (!fs.existsSync(target)) throw new Error(`Object not found: ${key}`);
    return fs.createReadStream(target);
  }

  async delete(key) {
    const target = this.resolve(key);
    if (fs.existsSync(target)) {
      await fs.promises.unlink(target);
      return true;
    }
    return false;
  }

  async exists(key) {
    return fs.existsSync(this.resolve(key));
  }

  sign(key, expiresAt) {
    return crypto
      .createHmac('sha256', config.local.signingSecret)
      .update(`${key}:${expiresAt}`)
      .digest('hex');
  }

  verify(key, expiresAt, signature) {
    if (!expiresAt || !signature) return false;
    if (Number(expiresAt) * 1000 < Date.now()) return false;

    const expected = this.sign(key, expiresAt);
    const a = Buffer.from(expected);
    const b = Buffer.from(String(signature));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  async signedUrl(key, ttlSeconds = config.storage.signedUrlTtl) {
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    const signature = this.sign(key, expiresAt);
    const encoded = encodeURIComponent(key);
    return `${config.publicBaseUrl}${config.basePath}/files/raw/${encoded}?expires=${expiresAt}&signature=${signature}`;
  }

  publicUrl(key) {
    return `${config.publicBaseUrl}${config.basePath}/files/static/${encodeURIComponent(key)}`;
  }

  supportsDirectServe() {
    return true;
  }

  async healthy() {
    try {
      await fs.promises.access(this.root, fs.constants.W_OK);
      return true;
    } catch (err) {
      return false;
    }
  }
}

module.exports = LocalProvider;
