'use strict';

const { swagger } = require('@erp/shared');
const config = require('../config');
const authSpec = require('./auth.swagger');

function buildDocument() {
  return swagger.buildBaseDocument({
    title: 'ERP Authentication Service',
    description: 'Authentication, session management, RBAC claims, OTP and password lifecycle.',
    version: config.version,
    tags: [
      { name: 'Authentication', description: 'Login, logout, registration' },
      { name: 'Sessions', description: 'Active session management' },
      { name: 'Password', description: 'Change, forgot and reset password' },
      { name: 'OTP', description: 'One-time code flows' }
    ],
    paths: authSpec.paths,
    components: { schemas: authSpec.schemas }
  });
}

module.exports = { buildDocument, swaggerUiOptions: swagger.swaggerUiOptions };
