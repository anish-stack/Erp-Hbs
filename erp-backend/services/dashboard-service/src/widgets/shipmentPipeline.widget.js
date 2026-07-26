'use strict';
const client = require('../clients/internal.client');
const { WIDGET_KEYS } = require('../constants');

module.exports = {
  key: WIDGET_KEYS.SHIPMENT_PIPELINE,
  title: 'Shipment Pipeline',
  async fetch(user) {
    const stats = await client.safeGet(client.urls.shipmentServiceUrl, '/api/v1/shipment/stats', user);
    if (!stats) return { available: false };
    return { available: true, total: stats.total, byStatus: stats.byStatus };
  }
};
