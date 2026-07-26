'use strict';
const client = require('../clients/internal.client');
const { WIDGET_KEYS } = require('../constants');

module.exports = {
  key: WIDGET_KEYS.SALES_SUMMARY,
  title: 'Sales Summary',
  async fetch(user) {
    const stats = await client.safeGet(client.urls.salesServiceUrl, '/api/v1/sales/stats', user);
    if (!stats) return { available: false };
    return {
      available: true,
      totalOrders: stats.total,
      totalValue: stats.grandTotal,
      byStatus: stats.byStatus
    };
  }
};
