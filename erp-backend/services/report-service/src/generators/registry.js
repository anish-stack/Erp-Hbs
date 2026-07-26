'use strict';
const client = require('../clients/internal.client');
const { REPORT_KEYS } = require('../constants');

/**
 * Each definition: { name, path, baseUrlKey, columns: [{ key, header, width }] }.
 * `columns[].key` is dotted-path safe for simple nested lookups (e.g. "a.b").
 */
function get(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

const REGISTRY = {
  [REPORT_KEYS.SALES_ORDERS]: {
    name: 'Sales Orders Register',
    baseUrl: () => client.urls.salesServiceUrl,
    path: '/api/v1/sales/orders',
    columns: [
      { key: 'code', header: 'Order Code', width: 18 },
      { key: 'status', header: 'Status', width: 16 },
      { key: 'customerName', header: 'Customer', width: 28 },
      { key: 'orderDate', header: 'Order Date', width: 14 },
      { key: 'warehouseId', header: 'Warehouse', width: 24 },
      { key: 'subtotal', header: 'Subtotal', width: 14 },
      { key: 'taxTotal', header: 'Tax', width: 12 },
      { key: 'grandTotal', header: 'Grand Total', width: 14 }
    ]
  },
  [REPORT_KEYS.PURCHASE_ORDERS]: {
    name: 'Purchase Orders Register',
    baseUrl: () => client.urls.purchaseServiceUrl,
    path: '/api/v1/purchase',
    columns: [
      { key: 'code', header: 'PO Code', width: 18 },
      { key: 'status', header: 'Status', width: 16 },
      { key: 'supplierName', header: 'Supplier', width: 28 },
      { key: 'expectedDate', header: 'Expected Date', width: 14 },
      { key: 'subTotal', header: 'Subtotal', width: 14 },
      { key: 'taxTotal', header: 'Tax', width: 12 },
      { key: 'grandTotal', header: 'Grand Total', width: 14 }
    ]
  },
  [REPORT_KEYS.INVENTORY_VALUATION]: {
    name: 'Inventory Valuation',
    baseUrl: () => client.urls.inventoryServiceUrl,
    path: '/api/v1/inventory/stock',
    columns: [
      { key: 'partCode', header: 'Part Code', width: 18 },
      { key: 'partName', header: 'Part Name', width: 30 },
      { key: 'warehouseId', header: 'Warehouse', width: 24 },
      { key: 'binLocation', header: 'Bin', width: 14 },
      { key: 'onHand', header: 'On Hand', width: 12 },
      { key: 'reserved', header: 'Reserved', width: 12 },
      { key: 'available', header: 'Available', width: 12 },
      { key: 'avgCost', header: 'Avg Cost', width: 12 },
      { key: 'totalValue', header: 'Total Value', width: 14 }
    ]
  },
  [REPORT_KEYS.FINANCE_OUTSTANDING]: {
    name: 'Finance Outstanding (AR/AP)',
    baseUrl: () => client.urls.financeServiceUrl,
    path: '/api/v1/finance/invoices',
    defaultQuery: { overdueOnly: 'false' },
    columns: [
      { key: 'code', header: 'Invoice Code', width: 18 },
      { key: 'type', header: 'Type', width: 12 },
      { key: 'partyName', header: 'Party', width: 28 },
      { key: 'invoiceDate', header: 'Invoice Date', width: 14 },
      { key: 'dueDate', header: 'Due Date', width: 14 },
      { key: 'grandTotal', header: 'Grand Total', width: 14 },
      { key: 'amountPaid', header: 'Paid', width: 12 },
      { key: 'amountDue', header: 'Due', width: 12 },
      { key: 'status', header: 'Status', width: 16 }
    ]
  },
  [REPORT_KEYS.QUALITY_REJECTIONS]: {
    name: 'Quality Rejections',
    baseUrl: () => client.urls.qualityServiceUrl,
    path: '/api/v1/quality/inspections',
    defaultQuery: { status: 'FAILED' },
    columns: [
      { key: 'code', header: 'Inspection Code', width: 18 },
      { key: 'partCode', header: 'Part Code', width: 18 },
      { key: 'supplierId', header: 'Supplier', width: 24 },
      { key: 'receivedQty', header: 'Received Qty', width: 14 },
      { key: 'rejectedQty', header: 'Rejected Qty', width: 14 },
      { key: 'disposition', header: 'Disposition', width: 16 },
      { key: 'completedAt', header: 'Completed At', width: 16 }
    ]
  }
};

function definitionFor(key) {
  return REGISTRY[key] || null;
}

function list() {
  return Object.entries(REGISTRY).map(([key, def]) => ({ key, name: def.name, columns: def.columns.map((c) => c.header) }));
}

module.exports = { REGISTRY, definitionFor, list, get };
