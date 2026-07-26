'use strict';

const path = require('path');
const { env } = require('@erp/shared');

const serviceRoot = path.resolve(__dirname, '../..');

module.exports = {
  serviceName: env.str('SERVICE_NAME', 'file-service'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('FILE_SERVICE_PORT', 4016),
  nodeEnv: env.str('NODE_ENV', 'development'),
  basePath: `/api/${env.str('API_VERSION', 'v1')}`,
  bodyLimit: env.str('BODY_LIMIT', '1mb'),
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 15000),
  publicBaseUrl: env.str('FILE_PUBLIC_BASE_URL', 'http://localhost:4016'),

  storage: {
    preference: env.str('STORAGE_PROVIDER', 'auto').toLowerCase(),
    signedUrlTtl: env.int('SIGNED_URL_TTL', 900),
    maxFileSizeBytes: env.int('MAX_FILE_SIZE_MB', 25) * 1024 * 1024,
    maxFilesPerRequest: env.int('MAX_FILES_PER_REQUEST', 10),
    orphanRetentionHours: env.int('ORPHAN_RETENTION_HOURS', 24)
  },

  r2: {
    accountId: env.str('R2_ACCOUNT_ID', ''),
    accessKeyId: env.str('R2_ACCESS_KEY_ID', ''),
    secretAccessKey: env.str('R2_SECRET_ACCESS_KEY', ''),
    bucket: env.str('R2_BUCKET', ''),
    region: env.str('R2_REGION', 'auto'),
    publicBaseUrl: env.str('R2_PUBLIC_BASE_URL', '')
  },

  cloudinary: {
    cloudName: env.str('CLOUDINARY_CLOUD_NAME', ''),
    apiKey: env.str('CLOUDINARY_API_KEY', ''),
    apiSecret: env.str('CLOUDINARY_API_SECRET', ''),
    folder: env.str('CLOUDINARY_FOLDER', 'erp')
  },

  local: {
    root: path.resolve(serviceRoot, env.str('LOCAL_STORAGE_PATH', './storage/files')),
    tmp: path.resolve(serviceRoot, env.str('LOCAL_TMP_PATH', './storage/tmp')),
    signingSecret: env.str('LOCAL_SIGNING_SECRET', 'change_me_local_signing_secret')
  },

  images: {
    thumbnailSizes: env
      .list('THUMBNAIL_SIZES', ['160', '480', '1024'])
      .map((size) => parseInt(size, 10))
      .filter((size) => Number.isInteger(size) && size > 0),
    quality: env.int('IMAGE_QUALITY', 82)
  },

  queue: {
    prefix: env.str('QUEUE_PREFIX', 'erp'),
    concurrency: env.int('QUEUE_CONCURRENCY', 3),
    runInline: env.bool('RUN_WORKERS_INLINE', true),
    attempts: env.int('FILE_QUEUE_ATTEMPTS', 5),
    backoffMs: env.int('FILE_QUEUE_BACKOFF_MS', 15000)
  }
};
