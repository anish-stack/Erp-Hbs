'use strict';

/**
 * Contract every storage backend must implement.
 * Business logic depends only on this interface, never on a concrete provider.
 */
class StorageProvider {
  constructor(kind) {
    this.kind = kind;
  }

  // eslint-disable-next-line no-unused-vars
  async put({ buffer, key, mimeType, visibility, metadata }) {
    throw new Error(`${this.kind}: put() not implemented`);
  }

  // eslint-disable-next-line no-unused-vars
  async getStream(key) {
    throw new Error(`${this.kind}: getStream() not implemented`);
  }

  // eslint-disable-next-line no-unused-vars
  async delete(key) {
    throw new Error(`${this.kind}: delete() not implemented`);
  }

  // eslint-disable-next-line no-unused-vars
  async exists(key) {
    throw new Error(`${this.kind}: exists() not implemented`);
  }

  // eslint-disable-next-line no-unused-vars
  async signedUrl(key, ttlSeconds) {
    throw new Error(`${this.kind}: signedUrl() not implemented`);
  }

  // eslint-disable-next-line no-unused-vars
  publicUrl(key) {
    return null;
  }

  /** Whether the provider can serve bytes directly to the browser. */
  supportsDirectServe() {
    return false;
  }

  async healthy() {
    return true;
  }
}

module.exports = StorageProvider;
