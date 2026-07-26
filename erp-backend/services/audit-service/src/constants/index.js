'use strict';

const AUDIT_ACTION = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
  STATUS_CHANGE: 'STATUS_CHANGE',
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
  SECURITY: 'SECURITY',
  OTHER: 'OTHER'
};

const AUDIT_SEVERITY = { INFO: 'INFO', WARNING: 'WARNING', CRITICAL: 'CRITICAL' };

const AUDIT_CHANNEL = { EVENT: 'EVENT', API: 'API', SYSTEM: 'SYSTEM' };

const QUEUE_NAMES = { AUDIT: 'audit.maintenance' };

const JOB_NAMES = {
  EXPORT_AUDIT: 'export-audit',
  ROLLUP_DAILY: 'rollup-daily',
  PURGE_RETENTION: 'purge-retention',
  PURGE_EXPORTS: 'purge-exports'
};

const EXPORT_COLUMNS = [
  { key: 'occurredAt', header: 'Occurred At', width: 22 },
  { key: 'event', header: 'Event', width: 28 },
  { key: 'entity', header: 'Entity', width: 20 },
  { key: 'entityId', header: 'Entity Id', width: 38 },
  { key: 'action', header: 'Action', width: 16 },
  { key: 'severity', header: 'Severity', width: 12 },
  { key: 'actorId', header: 'Actor Id', width: 38 },
  { key: 'actorEmail', header: 'Actor Email', width: 28 },
  { key: 'source', header: 'Source Service', width: 20 },
  { key: 'summary', header: 'Summary', width: 60 },
  { key: 'ipAddress', header: 'IP Address', width: 18 },
  { key: 'correlationId', header: 'Correlation Id', width: 38 }
];

const CACHE = {
  stats: (hash) => `audit:stats:${hash}`,
  pattern: 'audit:*'
};

module.exports = {
  AUDIT_ACTION,
  AUDIT_SEVERITY,
  AUDIT_CHANNEL,
  QUEUE_NAMES,
  JOB_NAMES,
  EXPORT_COLUMNS,
  CACHE
};
