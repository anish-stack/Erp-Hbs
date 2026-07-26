'use strict';
const client = require('../clients/internal.client');
const { WIDGET_KEYS } = require('../constants');

module.exports = {
  key: WIDGET_KEYS.INVENTORY_HEALTH,
  title: 'Inventory Health',
  async fetch(user) {
    const [stats, lowStock] = await Promise.all([
      client.safeGet(client.urls.inventoryServiceUrl, '/api/v1/inventory/stats', user),
      client.safeGet(client.urls.inventoryServiceUrl, '/api/v1/inventory/low-stock', user)
    ]);
    if (!stats) return { available: false };
    return {
      available: true,
      stockPositions: stats.positions,
      totalOnHand: stats.totals.onHand,
      totalValue: stats.totals.totalValue,
      byWarehouse: stats.byWarehouse,
      lowStockCount: Array.isArray(lowStock) ? lowStock.length : (lowStock && lowStock.items ? lowStock.items.length : 0)
    };
  }
};
