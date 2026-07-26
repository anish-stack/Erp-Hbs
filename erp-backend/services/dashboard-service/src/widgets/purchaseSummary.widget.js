'use strict';
const client = require('../clients/internal.client');
const { WIDGET_KEYS } = require('../constants');

module.exports = {
  key: WIDGET_KEYS.PURCHASE_SUMMARY,
  title: 'Purchase Summary',
  async fetch(user) {
    const stats = await client.safeGet(client.urls.purchaseServiceUrl, '/api/v1/purchase/stats', user);
    if (!stats) return { available: false };
    return {
      available: true,
      totalOrders: stats.total,
      totalValue: stats.totalValue,
      byStatus: stats.byStatus
    };
  }
};
