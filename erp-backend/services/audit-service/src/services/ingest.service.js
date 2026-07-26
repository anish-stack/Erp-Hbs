'use strict';

const { logger } = require('@erp/shared');
const AuditRepository = require('../repositories/audit.repository');
const DeadLetterRepository = require('../repositories/deadLetter.repository');
const { mapEvent } = require('../utils/eventMapper');
const config = require('../config');
const { AUDIT_CHANNEL } = require('../constants');

class IngestService {
  /**
   * Persists one broker envelope. Returns false when the event was a duplicate
   * (already recorded), which is normal with at-least-once delivery.
   */
  static async fromEvent(envelope) {
    if (!envelope || !envelope.event || !envelope.eventId) {
      await DeadLetterRepository.record({
        event: envelope && envelope.event,
        eventId: envelope && envelope.eventId,
        reason: 'Envelope missing event or eventId',
        rawPayload: envelope || null
      });
      return false;
    }

    const row = mapEvent(envelope, {
      channel: AUDIT_CHANNEL.EVENT,
      maxPayloadBytes: config.maxPayloadBytes
    });

    const inserted = await AuditRepository.insert(row);

    if (!inserted) {
      logger.debug('Duplicate audit event ignored: %s', envelope.eventId);
    }

    return inserted;
  }

  /** HTTP fallback for services that need to log something the bus never sees. */
  static async fromApi(payload, actor) {
    const envelope = {
      eventId: payload.eventId || require('crypto').randomUUID(),
      correlationId: payload.correlationId || null,
      event: payload.event,
      source: payload.source || 'api',
      occurredAt: payload.occurredAt || new Date().toISOString(),
      actor: payload.actorId || (actor ? actor.id : null),
      data: {
        ...payload.data,
        entity: payload.entity,
        entityId: payload.entityId,
        action: payload.action,
        severity: payload.severity,
        summary: payload.summary,
        changes: payload.changes,
        actorEmail: payload.actorEmail || (actor ? actor.email : null),
        actorRole: actor ? actor.role : null,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
        requestId: payload.requestId
      }
    };

    const row = mapEvent(envelope, {
      channel: AUDIT_CHANNEL.API,
      maxPayloadBytes: config.maxPayloadBytes
    });

    const inserted = await AuditRepository.insert(row);
    return { recorded: inserted, eventId: envelope.eventId, duplicate: !inserted };
  }

  static async recordFailure(envelope, error) {
    await DeadLetterRepository.record({
      event: envelope && envelope.event,
      eventId: envelope && envelope.eventId,
      reason: error.message,
      rawPayload: envelope || null
    });
  }
}

module.exports = IngestService;
