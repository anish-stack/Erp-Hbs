'use strict';
const PreferenceRepository = require('../repositories/preference.repository');

function shape(p) {
  if (!p) return null;
  return {
    userId: p.userId, emailEnabled: p.emailEnabled, smsEnabled: p.smsEnabled, inAppEnabled: p.inAppEnabled,
    mutedTypes: p.mutedTypes || [], email: p.email, phone: p.phone, updatedAt: p.updatedAt
  };
}

class PreferenceService {
  static async get(userId) {
    const p = await PreferenceRepository.findByUser(userId);
    return p ? shape(p) : { userId, emailEnabled: true, smsEnabled: false, inAppEnabled: true, mutedTypes: [], email: null, phone: null };
  }
  static async update(userId, payload) {
    const p = await PreferenceRepository.upsert(userId, {
      emailEnabled: payload.emailEnabled, smsEnabled: payload.smsEnabled, inAppEnabled: payload.inAppEnabled,
      mutedTypes: payload.mutedTypes, email: payload.email, phone: payload.phone
    });
    return shape(p);
  }
}
module.exports = PreferenceService;
