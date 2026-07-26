'use strict';

const { broker, EVENTS, logger } = require('@erp/shared');

async function emit(routingKey, payload, actorId) {
  try {
    return await broker.publish(routingKey, payload, { userId: actorId });
  } catch (err) {
    logger.error('Event emit failed [%s]: %s', routingKey, err.message);
    return null;
  }
}

module.exports = {
  uploaded: (file, actorId) =>
    emit(
      EVENTS.FILE.UPLOADED,
      {
        fileId: file.id,
        storageKey: file.storageKey,
        provider: file.provider,
        category: file.category,
        entity: file.entity,
        entityId: file.entityId,
        sizeBytes: file.sizeBytes,
        mimeType: file.mimeType,
        visibility: file.visibility
      },
      actorId
    ),

  deleted: (file, actorId) =>
    emit(
      EVENTS.FILE.DELETED,
      { fileId: file.id, storageKey: file.storageKey, entity: file.entity, entityId: file.entityId },
      actorId
    ),

  audit: (payload, actorId) => emit(EVENTS.AUDIT.LOG, payload, actorId)
};
