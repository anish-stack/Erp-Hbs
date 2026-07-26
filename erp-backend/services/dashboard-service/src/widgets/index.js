'use strict';
const salesSummary = require('./salesSummary.widget');
const purchaseSummary = require('./purchaseSummary.widget');
const inventoryHealth = require('./inventoryHealth.widget');
const qualityHealth = require('./qualityHealth.widget');
const financeOutstanding = require('./financeOutstanding.widget');
const shipmentPipeline = require('./shipmentPipeline.widget');

const WIDGETS = {
  [salesSummary.key]: salesSummary,
  [purchaseSummary.key]: purchaseSummary,
  [inventoryHealth.key]: inventoryHealth,
  [qualityHealth.key]: qualityHealth,
  [financeOutstanding.key]: financeOutstanding,
  [shipmentPipeline.key]: shipmentPipeline
};

function get(key) { return WIDGETS[key] || null; }
function all() { return Object.values(WIDGETS); }

module.exports = { get, all, WIDGETS };
