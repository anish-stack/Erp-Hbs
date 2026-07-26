'use strict';

const { broker, logger } = require('@erp/shared');

async function emit(routingKey, payload, actorId) {
  try {
    return await broker.publish(routingKey, payload, { userId: actorId });
  } catch (err) {
    logger.error('Event emit failed [%s]: %s', routingKey, err.message);
    return null;
  }
}

/** Master data changes ripple into pricing, stock and documents downstream. */
module.exports = {
  partCreated: (part, actorId) =>
    emit('master.part.created', {
      partId: part.id,
      partNumber: part.partNumber,
      manufacturerId: part.manufacturerId,
      categoryId: part.categoryId,
      uomId: part.uomId
    }, actorId),

  partUpdated: (part, changes, actorId) =>
    emit('master.part.updated', { partId: part.id, partNumber: part.partNumber, changes }, actorId),

  partDeleted: (part, actorId) =>
    emit('master.part.deleted', { partId: part.id, partNumber: part.partNumber }, actorId),

  partLifecycleChanged: (part, previous, actorId) =>
    emit('master.part.lifecycle_changed', {
      partId: part.id,
      partNumber: part.partNumber,
      lifecycle: part.lifecycle,
      previousLifecycle: previous,
      severity: ['OBSOLETE', 'END_OF_LIFE'].includes(part.lifecycle) ? 'WARNING' : 'INFO'
    }, actorId),

  manufacturerCreated: (manufacturer, actorId) =>
    emit('master.manufacturer.created', { manufacturerId: manufacturer.id, code: manufacturer.code }, actorId),

  categoryUpdated: (category, changes, actorId) =>
    emit('master.category.updated', { categoryId: category.id, code: category.code, changes }, actorId),

  currencyRateUpdated: (currency, actorId) =>
    emit('master.currency.updated', {
      currencyId: currency.id,
      code: currency.code,
      exchangeRate: String(currency.exchangeRate)
    }, actorId),

  settingUpdated: (setting, actorId) =>
    emit('master.setting.updated', {
      settingId: setting.id,
      key: setting.key,
      groupName: setting.groupName,
      severity: 'WARNING'
    }, actorId),

  emit
};
