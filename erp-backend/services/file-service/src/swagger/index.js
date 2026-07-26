'use strict';

const { swagger } = require('@erp/shared');
const config = require('../config');
const fileSpec = require('./file.swagger');

function buildDocument() {
  return swagger.buildBaseDocument({
    title: 'ERP File Service',
    description:
      'Provider-agnostic file storage. Business logic talks to one interface while bytes live in Cloudflare R2, Cloudinary or local disk, selected purely by environment.',
    version: config.version,
    tags: [
      { name: 'Upload', description: 'Single and bulk upload' },
      { name: 'Files', description: 'Metadata, download, attach, delete' },
      { name: 'Sharing', description: 'Expiring public links' },
      { name: 'Operations', description: 'Storage statistics and provider health' }
    ],
    paths: fileSpec.paths,
    components: { schemas: fileSpec.schemas }
  });
}

module.exports = { buildDocument, swaggerUiOptions: swagger.swaggerUiOptions };
