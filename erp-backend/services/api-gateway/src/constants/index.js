'use strict';

/** Routes that must never require a JWT. Matched against the path after /api/v1. */
const PUBLIC_ROUTES = [
  { method: 'POST', path: '/auth/login' },
  { method: 'POST', path: '/auth/refresh' },
  { method: 'POST', path: '/auth/forgot-password' },
  { method: 'POST', path: '/auth/reset-password' },
  { method: 'POST', path: '/auth/verify-otp' },
  { method: 'POST', path: '/auth/send-otp' },
  { method: 'POST', path: '/auth/resend-otp' }
];

const FORWARD_HEADERS = {
  USER_ID: 'x-user-id',
  USER_EMAIL: 'x-user-email',
  USER_ROLE: 'x-user-role',
  USER_ROLE_ID: 'x-user-role-id',
  USER_DEPARTMENT: 'x-user-department-id',
  USER_PERMISSIONS: 'x-user-permissions',
  TOKEN_ID: 'x-token-id',
  REQUEST_ID: 'x-request-id',
  GATEWAY: 'x-gateway'
};

const CIRCUIT_STATE = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

module.exports = { PUBLIC_ROUTES, FORWARD_HEADERS, CIRCUIT_STATE };
