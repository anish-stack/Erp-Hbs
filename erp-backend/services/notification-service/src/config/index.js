'use strict';
const { env } = require('@erp/shared');

module.exports = {
  serviceName: env.str('SERVICE_NAME', 'notification-service'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('NOTIFICATION_SERVICE_PORT', 4015),
  nodeEnv: env.str('NODE_ENV', 'development'),
  basePath: `/api/${env.str('API_VERSION', 'v1')}`,
  bodyLimit: env.str('BODY_LIMIT', '1mb'),
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 10000),
  cacheTtl: env.int('NOTIFICATION_CACHE_TTL', 300),

  socket: { corsOrigin: env.str('SOCKET_CORS_ORIGIN', '*') },

  mail: {
    enabled: env.bool('EMAIL_ENABLED', false),
    host: env.str('SMTP_HOST', ''),
    port: env.int('SMTP_PORT', 587),
    secure: env.bool('SMTP_SECURE', false),
    user: env.str('SMTP_USER', ''),
    pass: env.str('SMTP_PASS', ''),
    from: env.str('MAIL_FROM', 'ERP System <no-reply@example.com>')
  },

  sms: {
    enabled: env.bool('SMS_ENABLED', false),
    provider: env.str('SMS_PROVIDER', 'none'),
    apiKey: env.str('SMS_API_KEY', ''),
    senderId: env.str('SMS_SENDER_ID', 'ERPSYS')
  },

  retentionDays: env.int('RETENTION_DAYS', 90),
  crons: { retentionScan: env.str('RETENTION_SCAN_CRON', '0 3 * * *') },

  queue: {
    prefix: env.str('QUEUE_PREFIX', 'erp'),
    concurrency: env.int('QUEUE_CONCURRENCY', 4),
    runInline: env.bool('RUN_WORKERS_INLINE', true),
    attempts: env.int('NOTIFICATION_QUEUE_ATTEMPTS', 3),
    backoffMs: env.int('NOTIFICATION_QUEUE_BACKOFF_MS', 10000)
  }
};
