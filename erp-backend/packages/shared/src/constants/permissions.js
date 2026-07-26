'use strict';

/** Permission format: <module>.<action>  |  wildcard: <module>.* or *.* */
const ACTIONS = ['view', 'create', 'update', 'delete', 'approve', 'export', 'import'];

const MODULES = [
  'dashboard',
  'user',
  'role',
  'permission',
  'department',
  'part',
  'manufacturer',
  'category',
  'supplier',
  'customer',
  'lead',
  'rfq',
  'purchase',
  'grn',
  'inventory',
  'warehouse',
  'quality',
  'sales',
  'shipment',
  'finance',
  'invoice',
  'payment',
  'report',
  'notification',
  'audit',
  'file',
  'setting'
];

const PERMISSIONS = MODULES.reduce((acc, module) => {
  acc[module] = ACTIONS.reduce((inner, action) => {
    inner[action.toUpperCase()] = `${module}.${action}`;
    return inner;
  }, {});
  return acc;
}, {});

const ALL_PERMISSIONS = MODULES.flatMap((module) => ACTIONS.map((action) => `${module}.${action}`));

const SUPER_ADMIN_PERMISSION = '*.*';

module.exports = { ACTIONS, MODULES, PERMISSIONS, ALL_PERMISSIONS, SUPER_ADMIN_PERMISSION };
