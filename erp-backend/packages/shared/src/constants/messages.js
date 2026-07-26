'use strict';

module.exports = {
  AUTH: {
    UNAUTHORIZED: 'Authentication required',
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCOUNT_DISABLED: 'Account is disabled. Contact administrator',
    ACCOUNT_LOCKED: 'Account locked due to multiple failed attempts',
    TOKEN_MISSING: 'Authorization token is missing',
    TOKEN_REVOKED: 'Session expired. Please log in again',
    FORBIDDEN: 'You do not have permission to perform this action'
  },
  COMMON: {
    CREATED: 'Created successfully',
    UPDATED: 'Updated successfully',
    DELETED: 'Deleted successfully',
    FETCHED: 'Fetched successfully',
    NOT_FOUND: 'Resource not found',
    ALREADY_EXISTS: 'Resource already exists',
    VALIDATION_FAILED: 'Validation failed',
    INTERNAL_ERROR: 'Something went wrong. Please try again',
    RATE_LIMITED: 'Too many requests. Please slow down',
    SERVICE_UNAVAILABLE: 'Upstream service is unavailable'
  }
};
