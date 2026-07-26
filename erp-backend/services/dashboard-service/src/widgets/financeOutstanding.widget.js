'use strict';
const client = require('../clients/internal.client');
const { WIDGET_KEYS } = require('../constants');

module.exports = {
  key: WIDGET_KEYS.FINANCE_OUTSTANDING,
  title: 'Finance Outstanding',
  async fetch(user) {
    const stats = await client.safeGet(client.urls.financeServiceUrl, '/api/v1/finance/stats', user);
    if (!stats) return { available: false };
    return {
      available: true,
      receivableOutstanding: stats.receivableOutstanding,
      payableOutstanding: stats.payableOutstanding,
      totalOutstanding: stats.totalOutstanding,
      byStatus: stats.byStatus
    };
  }
};
