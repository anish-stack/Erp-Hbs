'use strict';

const { swagger } = require('@erp/shared');
const config = require('../config');
const userSpec = require('./user.swagger');

function buildDocument() {
  return swagger.buildBaseDocument({
    title: 'ERP User & Department Service',
    description:
      'User lifecycle, reporting hierarchy, departments, and queued Excel import/export.',
    version: config.version,
    tags: [
      { name: 'Users', description: 'User CRUD, status, role and password administration' },
      { name: 'Profile', description: 'Self-service profile' },
      { name: 'Bulk', description: 'Excel import and export via BullMQ' },
      { name: 'Departments', description: 'Department master' }
    ],
    paths: userSpec.paths,
    components: { schemas: userSpec.schemas }
  });
}

module.exports = { buildDocument, swaggerUiOptions: swagger.swaggerUiOptions };
