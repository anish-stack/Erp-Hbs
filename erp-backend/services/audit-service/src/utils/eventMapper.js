'use strict';

const { AUDIT_ACTION, AUDIT_SEVERITY } = require('../constants');

/** Trailing verb of a routing key -> canonical audit action. */
const VERB_ACTIONS = {
  created: AUDIT_ACTION.CREATE,
  registered: AUDIT_ACTION.CREATE,
  updated: AUDIT_ACTION.UPDATE,
  adjusted: AUDIT_ACTION.UPDATE,
  deleted: AUDIT_ACTION.DELETE,
  approved: AUDIT_ACTION.APPROVE,
  rejected: AUDIT_ACTION.REJECT,
  cancelled: AUDIT_ACTION.REJECT,
  logged_in: AUDIT_ACTION.LOGIN,
  logged_out: AUDIT_ACTION.LOGOUT,
  revoked: AUDIT_ACTION.SECURITY,
  status_changed: AUDIT_ACTION.STATUS_CHANGE,
  permissions_changed: AUDIT_ACTION.PERMISSION_CHANGE,
  password_changed: AUDIT_ACTION.SECURITY,
  blacklisted: AUDIT_ACTION.SECURITY,
  reserved: AUDIT_ACTION.UPDATE,
  released: AUDIT_ACTION.UPDATE,
  dispatched: AUDIT_ACTION.UPDATE,
  delivered: AUDIT_ACTION.UPDATE,
  passed: AUDIT_ACTION.APPROVE,
  failed: AUDIT_ACTION.REJECT,
  received: AUDIT_ACTION.CREATE,
  generated: AUDIT_ACTION.CREATE,
  uploaded: AUDIT_ACTION.CREATE,
  converted: AUDIT_ACTION.UPDATE,
  quoted: AUDIT_ACTION.UPDATE,
  assigned: AUDIT_ACTION.UPDATE,
  completed: AUDIT_ACTION.UPDATE,
  breached: AUDIT_ACTION.SECURITY
};

/** Events that must always stand out in the trail. */
const SEVERITY_OVERRIDES = [
  { match: /token\.revoked|reuse|blacklisted|credit_limit\.breached/, severity: AUDIT_SEVERITY.CRITICAL },
  { match: /permissions_changed|role\.deleted|user\.deleted/, severity: AUDIT_SEVERITY.CRITICAL },
  { match: /password_changed|status_changed|account_locked/, severity: AUDIT_SEVERITY.WARNING },
  { match: /low_stock|payment\.failed|inspection\.failed|rejected|cancelled/, severity: AUDIT_SEVERITY.WARNING }
];

const ID_FIELDS = [
  'id', 'entityId', 'userId', 'roleId', 'supplierId', 'customerId', 'leadId', 'rfqId',
  'purchaseOrderId', 'orderId', 'grnId', 'inventoryId', 'warehouseId', 'inspectionId',
  'salesOrderId', 'shipmentId', 'invoiceId', 'paymentId', 'fileId', 'partId', 'bulkJobId'
];

function toAction(routingKey, payload) {
  if (payload && payload.action && AUDIT_ACTION[payload.action]) return AUDIT_ACTION[payload.action];

  const segments = routingKey.split('.');
  const verb = segments[segments.length - 1];

  if (VERB_ACTIONS[verb]) return VERB_ACTIONS[verb];

  const lastTwo = segments.slice(-2).join('_');
  if (VERB_ACTIONS[lastTwo]) return VERB_ACTIONS[lastTwo];

  return AUDIT_ACTION.OTHER;
}

function toEntity(routingKey, payload) {
  if (payload && payload.entity) return String(payload.entity).slice(0, 60);

  const segments = routingKey.split('.');
  if (segments.length <= 1) return routingKey.slice(0, 60);

  const verb = segments[segments.length - 1];
  const known = VERB_ACTIONS[verb] || VERB_ACTIONS[segments.slice(-2).join('_')];

  const entitySegments = known ? segments.slice(0, -1) : segments;
  return (entitySegments.join('.') || routingKey).slice(0, 60);
}

function toEntityId(payload) {
  if (!payload || typeof payload !== 'object') return null;
  for (const field of ID_FIELDS) {
    if (payload[field]) return String(payload[field]).slice(0, 60);
  }
  return null;
}

function toSeverity(routingKey, payload) {
  if (payload && payload.severity && ['INFO', 'WARNING', 'CRITICAL'].includes(payload.severity)) {
    return payload.severity;
  }
  for (const rule of SEVERITY_OVERRIDES) {
    if (rule.match.test(routingKey)) return rule.severity;
  }
  return AUDIT_SEVERITY.INFO;
}

function toSummary(routingKey, entity, action, payload) {
  if (payload && payload.summary) return String(payload.summary).slice(0, 500);

  const parts = [`${action} on ${entity}`];
  const entityId = toEntityId(payload);
  if (entityId) parts.push(`(${entityId})`);

  if (payload) {
    if (payload.code) parts.push(`code=${payload.code}`);
    if (payload.status) parts.push(`status=${payload.status}`);
    if (payload.email) parts.push(`email=${payload.email}`);
    if (Array.isArray(payload.changes) && payload.changes.length) {
      parts.push(`fields=${payload.changes.slice(0, 8).join(',')}`);
    }
    if (payload.reason) parts.push(`reason=${payload.reason}`);
  }

  return parts.join(' ').slice(0, 500);
}

/** Truncates oversized payloads so one huge event cannot bloat the trail. */
function trimPayload(payload, maxBytes) {
  if (!payload) return null;
  const serialised = JSON.stringify(payload);
  if (Buffer.byteLength(serialised) <= maxBytes) return payload;

  return {
    __truncated: true,
    __originalBytes: Buffer.byteLength(serialised),
    preview: serialised.slice(0, Math.floor(maxBytes / 2))
  };
}

/** RabbitMQ envelope -> AuditLog row. */
function mapEvent(envelope, options = {}) {
  const routingKey = envelope.event;
  const payload = envelope.data || {};

  const entity = toEntity(routingKey, payload);
  const action = toAction(routingKey, payload);

  return {
    eventId: envelope.eventId,
    correlationId: envelope.correlationId || null,
    event: routingKey.slice(0, 100),
    source: (envelope.source || 'unknown').slice(0, 50),
    channel: options.channel || 'EVENT',
    entity,
    entityId: toEntityId(payload),
    action,
    severity: toSeverity(routingKey, payload),
    actorId: envelope.actor || payload.actorId || payload.userId || null,
    actorEmail: payload.actorEmail || payload.email || null,
    actorRole: payload.actorRole || payload.role || null,
    summary: toSummary(routingKey, entity, action, payload),
    payload: trimPayload(payload, options.maxPayloadBytes || 65536),
    changes: Array.isArray(payload.changes) ? payload.changes : null,
    ipAddress: payload.ipAddress || null,
    userAgent: payload.userAgent ? String(payload.userAgent).slice(0, 255) : null,
    requestId: payload.requestId || null,
    occurredAt: envelope.occurredAt ? new Date(envelope.occurredAt) : new Date()
  };
}

module.exports = { mapEvent, toAction, toEntity, toEntityId, toSeverity, toSummary, trimPayload };
