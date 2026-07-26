'use strict';

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { logger } = require('@erp/shared');
const StorageProvider = require('./StorageProvider');
const config = require('../../config');
const { STORAGE_KIND, VISIBILITY } = require('../../constants');

/** Cloudflare R2 over the S3 API. Preferred provider in production. */
class R2Provider extends StorageProvider {
  constructor() {
    super(STORAGE_KIND.R2);

    this.bucket = config.r2.bucket;
    this.client = new S3Client({
      region: config.r2.region || 'auto',
      endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey
      },
      forcePathStyle: true
    });
  }

  static isConfigured() {
    return Boolean(
      config.r2.accountId && config.r2.accessKeyId && config.r2.secretAccessKey && config.r2.bucket
    );
  }

  async put({ buffer, key, mimeType, visibility, metadata = {} }) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: Object.fromEntries(
          Object.entries(metadata).map(([name, value]) => [name, String(value)])
        )
      })
    );

    logger.info('Stored %s in R2 bucket %s (%d bytes)', key, this.bucket, buffer.length);

    return {
      key,
      provider: this.kind,
      bucket: this.bucket,
      size: buffer.length,
      mimeType,
      publicUrl: visibility === VISIBILITY.PUBLIC ? this.publicUrl(key) : null
    };
  }

  async getStream(key) {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key })
    );
    return response.Body;
  }

  async delete(key) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    return true;
  }

  async exists(key) {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (err) {
      return false;
    }
  }

  async signedUrl(key, ttlSeconds = config.storage.signedUrlTtl) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: ttlSeconds
    });
  }

  publicUrl(key) {
    if (!config.r2.publicBaseUrl) return null;
    return `${config.r2.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }

  async healthy() {
    try {
      await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, MaxKeys: 1 }));
      return true;
    } catch (err) {
      logger.error('R2 health check failed: %s', err.message);
      return false;
    }
  }
}

module.exports = R2Provider;
