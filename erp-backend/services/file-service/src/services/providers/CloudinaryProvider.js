'use strict';

const { Readable } = require('stream');
const cloudinary = require('cloudinary').v2;
const { logger } = require('@erp/shared');
const StorageProvider = require('./StorageProvider');
const config = require('../../config');
const { STORAGE_KIND, VISIBILITY } = require('../../constants');

/** Cloudinary fallback provider. Non-image assets are stored as raw resources. */
class CloudinaryProvider extends StorageProvider {
  constructor() {
    super(STORAGE_KIND.CLOUDINARY);

    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
      secure: true
    });
  }

  static isConfigured() {
    return Boolean(
      config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret
    );
  }

  resourceType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'raw';
  }

  publicIdOf(key) {
    return key.replace(/\.[^./]+$/, '');
  }

  async put({ buffer, key, mimeType, visibility, metadata = {} }) {
    const uploaded = await new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          public_id: this.publicIdOf(key),
          folder: config.cloudinary.folder,
          resource_type: this.resourceType(mimeType),
          type: visibility === VISIBILITY.PUBLIC ? 'upload' : 'authenticated',
          context: metadata,
          overwrite: true
        },
        (error, result) => (error ? reject(error) : resolve(result))
      );

      Readable.from(buffer).pipe(upload);
    });

    logger.info('Stored %s in Cloudinary (%d bytes)', key, buffer.length);

    return {
      key,
      provider: this.kind,
      bucket: config.cloudinary.folder,
      size: uploaded.bytes || buffer.length,
      mimeType,
      width: uploaded.width || null,
      height: uploaded.height || null,
      publicUrl: visibility === VISIBILITY.PUBLIC ? uploaded.secure_url : null
    };
  }

  async getStream(key) {
    const url = await this.signedUrl(key, 60);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Cloudinary fetch failed: ${response.status}`);
    return Readable.fromWeb(response.body);
  }

  async delete(key) {
    const result = await cloudinary.uploader.destroy(
      `${config.cloudinary.folder}/${this.publicIdOf(key)}`,
      { invalidate: true }
    );
    return result.result === 'ok';
  }

  async exists(key) {
    try {
      await cloudinary.api.resource(`${config.cloudinary.folder}/${this.publicIdOf(key)}`);
      return true;
    } catch (err) {
      return false;
    }
  }

  async signedUrl(key, ttlSeconds = config.storage.signedUrlTtl) {
    return cloudinary.url(`${config.cloudinary.folder}/${this.publicIdOf(key)}`, {
      secure: true,
      sign_url: true,
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + ttlSeconds
    });
  }

  publicUrl(key) {
    return cloudinary.url(`${config.cloudinary.folder}/${this.publicIdOf(key)}`, { secure: true });
  }

  async healthy() {
    try {
      await cloudinary.api.ping();
      return true;
    } catch (err) {
      logger.error('Cloudinary health check failed: %s', err.message);
      return false;
    }
  }
}

module.exports = CloudinaryProvider;
