'use strict';

const { env } = require('@erp/shared');

module.exports = {
  serviceName: env.str('SERVICE_NAME', 'auth-service'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('AUTH_SERVICE_PORT', 4001),
  nodeEnv: env.str('NODE_ENV', 'development'),
  apiPrefix: `/api/${env.str('API_VERSION', 'v1')}/auth`,
  bodyLimit: env.str('BODY_LIMIT', '1mb'),
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 10000),

  security: {
    maxLoginAttempts: env.int('MAX_LOGIN_ATTEMPTS', 5),
    lockMinutes: env.int('LOGIN_LOCK_MINUTES', 15),
    permissionCacheTtl: env.int('PERMISSION_CACHE_TTL', 900)
  },

  otp: {
    length: env.int('OTP_LENGTH', 6),
    ttlSeconds: env.int('OTP_TTL_SECONDS', 300),
    maxVerifyAttempts: env.int('OTP_MAX_VERIFY_ATTEMPTS', 5)
  },

  passwordReset: {
    ttlMinutes: env.int('PASSWORD_RESET_TTL_MINUTES', 30)
  },

  mail: {
    host: env.str('SMTP_HOST', ''),
    port: env.int('SMTP_PORT', 587),
    secure: env.bool('SMTP_SECURE', false),
    user: env.str('SMTP_USER', ''),
    password: env.str('SMTP_PASSWORD', ''),
    fromName: env.str('MAIL_FROM_NAME', 'ERP Platform'),
    fromAddress: env.str('MAIL_FROM_ADDRESS', 'no-reply@example.com')
  },

  app: {
    name: env.str('APP_NAME', 'Enterprise ERP'),
    url: env.str('APP_URL', 'http://localhost:3000')
  },

  queue: {
    prefix: env.str('QUEUE_PREFIX', 'erp'),
    attempts: env.int('EMAIL_QUEUE_ATTEMPTS', 5),
    backoffMs: env.int('EMAIL_QUEUE_BACKOFF_MS', 5000),
    runInline: env.bool('RUN_WORKERS_INLINE', true),
    concurrency: env.int('QUEUE_CONCURRENCY', 5)
  }
};
