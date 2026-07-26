'use strict';

const config = require('../config');

const base = `${config.basePath}/files`;

const fileSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    originalName: { type: 'string', example: 'invoice-2026-0142.pdf' },
    mimeType: { type: 'string', example: 'application/pdf' },
    category: {
      type: 'string',
      enum: ['IMAGE', 'DOCUMENT', 'SPREADSHEET', 'INVOICE', 'CERTIFICATE', 'DATASHEET', 'AVATAR', 'OTHER']
    },
    sizeBytes: { type: 'integer' },
    sizeReadable: { type: 'string', example: '184.2 KB' },
    checksum: { type: 'string', description: 'SHA-256 of the bytes, used for deduplication' },
    provider: { type: 'string', enum: ['R2', 'CLOUDINARY', 'LOCAL'] },
    visibility: { type: 'string', enum: ['PUBLIC', 'PRIVATE'] },
    entity: { type: 'string', nullable: true, example: 'purchase.order' },
    entityId: { type: 'string', nullable: true },
    variants: {
      type: 'object',
      nullable: true,
      description: 'Generated WebP thumbnails, keyed by width',
      example: { w160: { key: 'image/2026/07/x_160.webp', sizeBytes: 6120 } }
    },
    processStatus: { type: 'string', enum: ['NONE', 'QUEUED', 'PROCESSING', 'DONE', 'FAILED'] },
    downloadCount: { type: 'integer' },
    publicUrl: { type: 'string', nullable: true }
  }
};

const uploadFields = {
  category: { type: 'string', enum: ['IMAGE', 'DOCUMENT', 'SPREADSHEET', 'INVOICE', 'CERTIFICATE', 'DATASHEET', 'AVATAR', 'OTHER'] },
  visibility: { type: 'string', enum: ['PUBLIC', 'PRIVATE'], default: 'PRIVATE' },
  entity: { type: 'string', example: 'purchase.order' },
  entityId: { type: 'string' },
  tag: { type: 'string', example: 'signed-copy' }
};

const idParam = [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }];

const paths = {
  [`${base}/upload`]: {
    post: {
      tags: ['Upload'],
      summary: 'Upload one file',
      description:
        'Validates size, category whitelist, extension blacklist and magic bytes, then stores through the active provider. Identical bytes from the same user are deduplicated.',
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: { file: { type: 'string', format: 'binary' }, ...uploadFields }
            }
          }
        }
      },
      responses: {
        201: { description: 'File uploaded', content: { 'application/json': { schema: fileSchema } } },
        400: { description: 'Rejected by validation (type mismatch, too large, blocked extension)' }
      }
    }
  },

  [`${base}/upload/bulk`]: {
    post: {
      tags: ['Upload'],
      summary: 'Upload up to 10 files, reporting per-file failures',
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['files'],
              properties: {
                files: { type: 'array', items: { type: 'string', format: 'binary' } },
                ...uploadFields
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Upload summary with uploaded[] and failed[]' } }
    }
  },

  [base]: {
    get: {
      tags: ['Files'],
      summary: 'List files',
      description: 'Without the file.view permission a caller only sees their own uploads.',
      parameters: [
        { $ref: '#/components/parameters/page' },
        { $ref: '#/components/parameters/limit' },
        { $ref: '#/components/parameters/search' },
        { in: 'query', name: 'entity', schema: { type: 'string' } },
        { in: 'query', name: 'entityId', schema: { type: 'string' } },
        { in: 'query', name: 'category', schema: { type: 'string' } },
        { in: 'query', name: 'visibility', schema: { type: 'string', enum: ['PUBLIC', 'PRIVATE'] } }
      ],
      responses: { 200: { description: 'Files fetched' } }
    }
  },

  [`${base}/stats`]: {
    get: {
      tags: ['Operations'],
      summary: 'Storage usage by category and provider',
      responses: { 200: { description: 'Statistics fetched' } }
    }
  },

  [`${base}/providers`]: {
    get: {
      tags: ['Operations'],
      summary: 'Which providers are configured and which one is active',
      responses: { 200: { description: 'Provider availability fetched' } }
    }
  },

  [`${base}/entity/{entity}/{entityId}`]: {
    get: {
      tags: ['Files'],
      summary: 'All files attached to a business record',
      parameters: [
        { in: 'path', name: 'entity', required: true, schema: { type: 'string' } },
        { in: 'path', name: 'entityId', required: true, schema: { type: 'string' } }
      ],
      responses: { 200: { description: 'Files fetched' } }
    }
  },

  [`${base}/{id}`]: {
    get: {
      tags: ['Files'],
      summary: 'File metadata',
      parameters: idParam,
      responses: { 200: { description: 'File fetched' }, 403: { $ref: '#/components/responses/Forbidden' } }
    },
    delete: {
      tags: ['Files'],
      summary: 'Soft delete a file and queue the object purge',
      parameters: idParam,
      responses: { 200: { description: 'Deleted, physical purge queued' } }
    }
  },

  [`${base}/{id}/signed-url`]: {
    get: {
      tags: ['Files'],
      summary: 'Time-boxed direct URL',
      description: 'R2 returns a presigned S3 URL, Cloudinary a signed delivery URL, local an HMAC URL served by this service.',
      parameters: [
        ...idParam,
        { in: 'query', name: 'ttlSeconds', schema: { type: 'integer', minimum: 30, maximum: 86400, default: 900 } }
      ],
      responses: { 200: { description: 'Signed URL generated' } }
    }
  },

  [`${base}/{id}/download`]: {
    get: {
      tags: ['Files'],
      summary: 'Stream the file as an attachment',
      parameters: idParam,
      responses: { 200: { description: 'File bytes' } }
    }
  },

  [`${base}/{id}/preview`]: {
    get: {
      tags: ['Files'],
      summary: 'Stream the file inline',
      parameters: idParam,
      responses: { 200: { description: 'File bytes' } }
    }
  },

  [`${base}/{id}/attach`]: {
    patch: {
      tags: ['Files'],
      summary: 'Bind an uploaded file to a business record',
      description: 'Unattached uploads are cleaned up automatically after the orphan retention window.',
      parameters: idParam,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['entity', 'entityId'],
              properties: { entity: { type: 'string' }, entityId: { type: 'string' }, tag: { type: 'string' } }
            }
          }
        }
      },
      responses: { 200: { description: 'File attached' } }
    }
  },

  [`${base}/{id}/replace`]: {
    put: {
      tags: ['Files'],
      summary: 'Replace the bytes of a file, keeping its binding',
      parameters: idParam,
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } }
          }
        }
      },
      responses: { 200: { description: 'File replaced' } }
    }
  },

  [`${base}/{id}/shares`]: {
    post: {
      tags: ['Sharing'],
      summary: 'Create an expiring public link for a private file',
      parameters: idParam,
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                expiresInMinutes: { type: 'integer', default: 1440, maximum: 43200 },
                maxUses: { type: 'integer', nullable: true },
                note: { type: 'string' }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Share link created' } }
    },
    get: {
      tags: ['Sharing'],
      summary: 'List share links of a file',
      parameters: idParam,
      responses: { 200: { description: 'Share links fetched' } }
    }
  },

  [`${base}/{id}/shares/{shareId}`]: {
    delete: {
      tags: ['Sharing'],
      summary: 'Revoke a share link',
      parameters: [
        ...idParam,
        { in: 'path', name: 'shareId', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      responses: { 200: { description: 'Revoked' } }
    }
  },

  [`${base}/shared/{token}`]: {
    get: {
      tags: ['Sharing'],
      summary: 'Open a shared file (no authentication)',
      description: 'Enforces expiry, revocation and the optional use limit.',
      security: [],
      parameters: [{ in: 'path', name: 'token', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'File bytes' },
        403: { description: 'Expired or usage limit reached' },
        404: { description: 'Invalid link' }
      }
    }
  }
};

module.exports = { paths, schemas: { File: fileSchema } };
