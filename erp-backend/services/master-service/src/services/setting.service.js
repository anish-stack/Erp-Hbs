'use strict';

const { ApiError } = require('@erp/shared');
const SettingRepository = require('../repositories/setting.repository');
const CacheService = require('./cache.service');
const publisher = require('../events/publisher');
const { CACHE, SETTING_TYPE } = require('../constants');

function coerce(value, dataType) {
  switch (dataType) {
    case SETTING_TYPE.NUMBER: {
      const number = Number(value);
      if (Number.isNaN(number)) throw ApiError.badRequest('Value must be a number');
      return number;
    }
    case SETTING_TYPE.BOOLEAN:
      return value === true || value === 'true' || value === 1 || value === '1';
    case SETTING_TYPE.JSON:
      if (typeof value === 'object') return value;
      try {
        return JSON.parse(value);
      } catch (err) {
        throw ApiError.badRequest('Value must be valid JSON');
      }
    default:
      return String(value);
  }
}

function shape(row) {
  return {
    key: row.key,
    groupName: row.groupName,
    label: row.label,
    value: row.value,
    dataType: row.dataType,
    description: row.description,
    isPublic: row.isPublic,
    isEditable: row.isEditable,
    updatedAt: row.updatedAt
  };
}

class SettingService {
  static async list(groupName = null) {
    return CacheService.remember(CACHE.settings(groupName), async () => {
      const rows = await SettingRepository.all(groupName);
      return rows.map(shape);
    });
  }

  /** Flat key/value map for the frontend bootstrap call. */
  static async publicMap() {
    return CacheService.remember(CACHE.publicSettings(), async () => {
      const rows = await SettingRepository.publicOnly();
      return rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    });
  }

  static async groups() {
    return SettingRepository.groups();
  }

  static async get(key) {
    const row = await SettingRepository.findByKey(key);
    if (!row) throw ApiError.notFound(`Setting "${key}" not found`);
    return shape(row);
  }

  static async update(key, value, actorId) {
    const row = await SettingRepository.findByKey(key);
    if (!row) throw ApiError.notFound(`Setting "${key}" not found`);
    if (!row.isEditable) throw ApiError.forbidden(`Setting "${key}" is read-only`);

    const updated = await SettingRepository.updateValue(key, coerce(value, row.dataType), actorId);

    await CacheService.bust('setting-updated');
    await publisher.settingUpdated(updated, actorId);

    return shape(updated);
  }

  static async bulkUpdate(entries, actorId) {
    const results = [];
    const failures = [];

    for (const entry of entries) {
      try {
        results.push(await SettingService.update(entry.key, entry.value, actorId));
      } catch (err) {
        failures.push({ key: entry.key, error: err.message });
      }
    }

    return { updated: results, failed: failures };
  }

  static async define(payload, actorId) {
    const row = await SettingRepository.upsert(
      payload.key,
      {
        groupName: payload.groupName,
        label: payload.label,
        value: coerce(payload.value, payload.dataType || SETTING_TYPE.STRING),
        dataType: payload.dataType || SETTING_TYPE.STRING,
        description: payload.description || null,
        isPublic: payload.isPublic === true,
        isEditable: payload.isEditable !== false
      },
      actorId
    );

    await CacheService.bust('setting-defined');
    return shape(row);
  }
}

module.exports = SettingService;
