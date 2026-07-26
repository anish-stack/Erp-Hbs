'use strict';

const path = require('path');
const { env } = require('@erp/shared');

env.load(path.resolve(__dirname, '..'));

const { PrismaClient } = require('../src/generated/prisma');
const { logger } = require('@erp/shared');

const prisma = new PrismaClient();

/** parent code -> children. `null` path means a group header. */
const SIDEBAR = [
  { code: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', path: '/dashboard', module: 'dashboard', permissionCode: 'dashboard.view', sortOrder: 10 },

  { code: 'crm', label: 'CRM', icon: 'users', sortOrder: 20, children: [
    { code: 'crm.leads', label: 'Leads', icon: 'user-plus', path: '/crm/leads', module: 'lead', permissionCode: 'lead.view', sortOrder: 10 },
    { code: 'crm.customers', label: 'Customers', icon: 'building', path: '/crm/customers', module: 'customer', permissionCode: 'customer.view', sortOrder: 20 }
  ] },

  { code: 'procurement', label: 'Procurement', icon: 'shopping-cart', sortOrder: 30, children: [
    { code: 'procurement.suppliers', label: 'Suppliers', icon: 'truck', path: '/procurement/suppliers', module: 'supplier', permissionCode: 'supplier.view', sortOrder: 10 },
    { code: 'procurement.rfq', label: 'RFQ', icon: 'file-question', path: '/procurement/rfq', module: 'rfq', permissionCode: 'rfq.view', badgeKey: 'rfq.pending', sortOrder: 20 },
    { code: 'procurement.orders', label: 'Purchase Orders', icon: 'clipboard-list', path: '/procurement/orders', module: 'purchase', permissionCode: 'purchase.view', badgeKey: 'purchase.pendingApprovals', sortOrder: 30 },
    { code: 'procurement.grn', label: 'Goods Receipt', icon: 'package-check', path: '/procurement/grn', module: 'grn', permissionCode: 'grn.view', sortOrder: 40 }
  ] },

  { code: 'inventory', label: 'Inventory', icon: 'boxes', sortOrder: 40, children: [
    { code: 'inventory.stock', label: 'Stock', icon: 'package', path: '/inventory/stock', module: 'inventory', permissionCode: 'inventory.view', badgeKey: 'inventory.lowStock', sortOrder: 10 },
    { code: 'inventory.warehouses', label: 'Warehouses', icon: 'warehouse', path: '/inventory/warehouses', module: 'warehouse', permissionCode: 'warehouse.view', sortOrder: 20 },
    { code: 'inventory.transfers', label: 'Stock Transfers', icon: 'arrow-left-right', path: '/inventory/transfers', module: 'warehouse', permissionCode: 'warehouse.update', sortOrder: 30 },
    { code: 'inventory.adjustments', label: 'Adjustments', icon: 'sliders', path: '/inventory/adjustments', module: 'inventory', permissionCode: 'inventory.update', sortOrder: 40 }
  ] },

  { code: 'quality', label: 'Quality', icon: 'shield-check', sortOrder: 50, children: [
    { code: 'quality.inspections', label: 'Inspections', icon: 'search-check', path: '/quality/inspections', module: 'quality', permissionCode: 'quality.view', badgeKey: 'quality.pending', sortOrder: 10 }
  ] },

  { code: 'sales', label: 'Sales', icon: 'trending-up', sortOrder: 60, children: [
    { code: 'sales.orders', label: 'Sales Orders', icon: 'receipt', path: '/sales/orders', module: 'sales', permissionCode: 'sales.view', badgeKey: 'sales.pendingApprovals', sortOrder: 10 },
    { code: 'sales.quotations', label: 'Quotations', icon: 'file-text', path: '/sales/quotations', module: 'sales', permissionCode: 'sales.view', sortOrder: 20 }
  ] },

  { code: 'shipment', label: 'Logistics', icon: 'ship', sortOrder: 70, children: [
    { code: 'shipment.list', label: 'Shipments', icon: 'truck', path: '/logistics/shipments', module: 'shipment', permissionCode: 'shipment.view', badgeKey: 'shipment.inTransit', sortOrder: 10 }
  ] },

  { code: 'finance', label: 'Finance', icon: 'wallet', sortOrder: 80, children: [
    { code: 'finance.invoices', label: 'Invoices', icon: 'file-spreadsheet', path: '/finance/invoices', module: 'invoice', permissionCode: 'invoice.view', sortOrder: 10 },
    { code: 'finance.payments', label: 'Payments', icon: 'credit-card', path: '/finance/payments', module: 'payment', permissionCode: 'payment.view', sortOrder: 20 },
    { code: 'finance.ledger', label: 'Ledger', icon: 'book', path: '/finance/ledger', module: 'finance', permissionCode: 'finance.view', sortOrder: 30 }
  ] },

  { code: 'masters', label: 'Master Data', icon: 'database', sortOrder: 90, children: [
    { code: 'masters.parts', label: 'Part Master', icon: 'cpu', path: '/masters/parts', module: 'part', permissionCode: 'part.view', sortOrder: 10 },
    { code: 'masters.manufacturers', label: 'Manufacturers', icon: 'factory', path: '/masters/manufacturers', module: 'manufacturer', permissionCode: 'manufacturer.view', sortOrder: 20 },
    { code: 'masters.categories', label: 'Categories', icon: 'tags', path: '/masters/categories', module: 'category', permissionCode: 'category.view', sortOrder: 30 },
    { code: 'masters.departments', label: 'Departments', icon: 'network', path: '/masters/departments', module: 'department', permissionCode: 'department.view', sortOrder: 40 }
  ] },

  { code: 'reports', label: 'Reports', icon: 'bar-chart-3', path: '/reports', module: 'report', permissionCode: 'report.view', sortOrder: 100 },

  { code: 'administration', label: 'Administration', icon: 'settings', sortOrder: 110, children: [
    { code: 'administration.users', label: 'Users', icon: 'user-cog', path: '/admin/users', module: 'user', permissionCode: 'user.view', sortOrder: 10 },
    { code: 'administration.roles', label: 'Roles & Permissions', icon: 'key-round', path: '/admin/roles', module: 'role', permissionCode: 'role.view', sortOrder: 20 },
    { code: 'administration.menus', label: 'Menu Builder', icon: 'list-tree', path: '/admin/menus', module: 'setting', permissionCode: 'setting.update', sortOrder: 30 },
    { code: 'administration.audit', label: 'Audit Logs', icon: 'scroll-text', path: '/admin/audit', module: 'audit', permissionCode: 'audit.view', sortOrder: 40 },
    { code: 'administration.files', label: 'File Manager', icon: 'folder', path: '/admin/files', module: 'file', permissionCode: 'file.view', sortOrder: 50 },
    { code: 'administration.settings', label: 'Settings', icon: 'sliders-horizontal', path: '/admin/settings', module: 'setting', permissionCode: 'setting.view', sortOrder: 60 }
  ] }
];

const HEADER = [
  { code: 'header.notifications', label: 'Notifications', icon: 'bell', path: '/notifications', module: 'notification', permissionCode: 'notification.view', badgeKey: 'notification.unread', sortOrder: 10 },
  { code: 'header.search', label: 'Global Search', icon: 'search', path: '/search', sortOrder: 20 },
  { code: 'header.reports', label: 'Quick Reports', icon: 'pie-chart', path: '/reports/quick', module: 'report', permissionCode: 'report.view', sortOrder: 30 }
];

const WIDGETS = [
  { code: 'widget.sales.summary', label: 'Sales Summary', icon: 'trending-up', path: '/widgets/sales-summary', module: 'sales', permissionCode: 'sales.view', sortOrder: 10, meta: { span: 6, chart: 'line' } },
  { code: 'widget.purchase.pending', label: 'Pending PO Approvals', icon: 'clipboard-check', path: '/widgets/purchase-pending', module: 'purchase', permissionCode: 'purchase.approve', sortOrder: 20, meta: { span: 3, chart: 'stat' } },
  { code: 'widget.inventory.low', label: 'Low Stock Alerts', icon: 'alert-triangle', path: '/widgets/low-stock', module: 'inventory', permissionCode: 'inventory.view', sortOrder: 30, meta: { span: 3, chart: 'list' } },
  { code: 'widget.rfq.pipeline', label: 'RFQ Pipeline', icon: 'git-branch', path: '/widgets/rfq-pipeline', module: 'rfq', permissionCode: 'rfq.view', sortOrder: 40, meta: { span: 6, chart: 'funnel' } },
  { code: 'widget.finance.receivables', label: 'Receivables Ageing', icon: 'wallet', path: '/widgets/receivables', module: 'finance', permissionCode: 'finance.view', sortOrder: 50, meta: { span: 6, chart: 'bar' } },
  { code: 'widget.shipment.transit', label: 'Shipments In Transit', icon: 'ship', path: '/widgets/shipments', module: 'shipment', permissionCode: 'shipment.view', sortOrder: 60, meta: { span: 4, chart: 'map' } },
  { code: 'widget.quality.pending', label: 'Pending Inspections', icon: 'shield-check', path: '/widgets/quality-pending', module: 'quality', permissionCode: 'quality.view', sortOrder: 70, meta: { span: 4, chart: 'stat' } }
];

const QUICK_ACTIONS = [
  { code: 'action.rfq.new', label: 'New RFQ', icon: 'file-plus', path: '/procurement/rfq/new', module: 'rfq', permissionCode: 'rfq.create', sortOrder: 10 },
  { code: 'action.purchase.new', label: 'New Purchase Order', icon: 'cart-plus', path: '/procurement/orders/new', module: 'purchase', permissionCode: 'purchase.create', sortOrder: 20 },
  { code: 'action.sales.new', label: 'New Sales Order', icon: 'receipt-text', path: '/sales/orders/new', module: 'sales', permissionCode: 'sales.create', sortOrder: 30 },
  { code: 'action.grn.new', label: 'Record GRN', icon: 'package-plus', path: '/procurement/grn/new', module: 'grn', permissionCode: 'grn.create', sortOrder: 40 },
  { code: 'action.lead.new', label: 'Add Lead', icon: 'user-plus', path: '/crm/leads/new', module: 'lead', permissionCode: 'lead.create', sortOrder: 50 }
];

async function upsertMenu(node, type, parentId = null) {
  const { children, ...data } = node;

  const menu = await prisma.menu.upsert({
    where: { code: data.code },
    update: {
      label: data.label,
      icon: data.icon || null,
      path: data.path || null,
      type,
      module: data.module || null,
      permissionCode: data.permissionCode || null,
      badgeKey: data.badgeKey || null,
      parentId,
      sortOrder: data.sortOrder ?? 0,
      isActive: true,
      deletedAt: null,
      meta: data.meta || null
    },
    create: {
      code: data.code,
      label: data.label,
      icon: data.icon || null,
      path: data.path || null,
      type,
      module: data.module || null,
      permissionCode: data.permissionCode || null,
      badgeKey: data.badgeKey || null,
      parentId,
      sortOrder: data.sortOrder ?? 0,
      meta: data.meta || null
    }
  });

  let count = 1;
  for (const child of children || []) {
    count += await upsertMenu(child, type, menu.id);
  }
  return count;
}

async function main() {
  logger.info('Seeding menus');

  let total = 0;
  for (const node of SIDEBAR) total += await upsertMenu(node, 'SIDEBAR');
  for (const node of HEADER) total += await upsertMenu(node, 'HEADER');
  for (const node of WIDGETS) total += await upsertMenu(node, 'DASHBOARD_WIDGET');
  for (const node of QUICK_ACTIONS) total += await upsertMenu(node, 'QUICK_ACTION');

  logger.info('Seeded %d menu entries', total);
  logger.info('Menus are permission-driven by default - no role assignment required');
}

main()
  .catch((err) => {
    logger.error('Seed failed: %s', err.stack || err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
