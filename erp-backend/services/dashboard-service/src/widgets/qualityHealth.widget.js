'use strict';
const client = require('../clients/internal.client');
const { WIDGET_KEYS } = require('../constants');

module.exports = {
  key: WIDGET_KEYS.QUALITY_HEALTH,
  title: 'Quality Health',
  async fetch(user) {
    const stats = await client.safeGet(client.urls.qualityServiceUrl, '/api/v1/quality/stats', user);
    if (!stats) return { available: false };
    return {
      available: true,
      byStatus: stats.byStatus,
      rejectionRatePct: stats.rejectionRatePct,
      quantities: stats.quantities
    };
  }
};
