'use strict';

const LIFECYCLE = {
  ACTIVE: 'ACTIVE',
  NRND: 'NRND',
  OBSOLETE: 'OBSOLETE',
  END_OF_LIFE: 'END_OF_LIFE',
  PREVIEW: 'PREVIEW'
};

const MOUNTING = {
  SMD: 'SMD',
  THROUGH_HOLE: 'THROUGH_HOLE',
  PANEL: 'PANEL',
  MODULE: 'MODULE',
  UNKNOWN: 'UNKNOWN'
};

const ALTERNATE_TYPE = {
  EXACT: 'EXACT',
  FUNCTIONAL: 'FUNCTIONAL',
  UPGRADE: 'UPGRADE',
  DOWNGRADE: 'DOWNGRADE'
};

const SETTING_TYPE = { STRING: 'STRING', NUMBER: 'NUMBER', BOOLEAN: 'BOOLEAN', JSON: 'JSON' };

const RESET_POLICY = { NEVER: 'NEVER', YEARLY: 'YEARLY', MONTHLY: 'MONTHLY' };

/** Sequence keys other services request by name. */
const SEQUENCE_KEYS = {
  RFQ: 'RFQ',
  PURCHASE_ORDER: 'PURCHASE_ORDER',
  GRN: 'GRN',
  SALES_ORDER: 'SALES_ORDER',
  QUOTATION: 'QUOTATION',
  INVOICE: 'INVOICE',
  PAYMENT: 'PAYMENT',
  SHIPMENT: 'SHIPMENT',
  INSPECTION: 'INSPECTION',
  STOCK_TRANSFER: 'STOCK_TRANSFER',
  CREDIT_NOTE: 'CREDIT_NOTE',
  SUPPLIER: 'SUPPLIER',
  CUSTOMER: 'CUSTOMER'
};

const CACHE = {
  manufacturers: () => 'master:manufacturers:options',
  categoryTree: () => 'master:categories:tree',
  uoms: () => 'master:uoms',
  currencies: () => 'master:currencies',
  taxRates: () => 'master:taxrates',
  part: (id) => `master:part:${id}`,
  settings: (group) => `master:settings:${group || 'all'}`,
  publicSettings: () => 'master:settings:public',
  pattern: 'master:*'
};

module.exports = {
  LIFECYCLE,
  MOUNTING,
  ALTERNATE_TYPE,
  SETTING_TYPE,
  RESET_POLICY,
  SEQUENCE_KEYS,
  CACHE
};
