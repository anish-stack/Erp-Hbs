'use strict';

const LEAD_STAGE = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  PROPOSAL: 'PROPOSAL',
  NEGOTIATION: 'NEGOTIATION',
  WON: 'WON',
  LOST: 'LOST'
};


const CATEGORY_MIME = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
  AVATAR: ['image/jpeg', 'image/png', 'image/webp'],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv'
  ],
  SPREADSHEET: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ],
  INVOICE: ['application/pdf', 'image/jpeg', 'image/png'],
  CERTIFICATE: ['application/pdf', 'image/jpeg', 'image/png'],
  DATASHEET: ['application/pdf'],
  OTHER: [
    'application/pdf',
    'application/zip',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};
/** 7-stage pipeline. WON/LOST are terminal; LOST can be revived to CONTACTED. */
const STAGE_TRANSITIONS = {
  NEW: ['CONTACTED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'LOST'],
  QUALIFIED: ['PROPOSAL', 'LOST'],
  PROPOSAL: ['NEGOTIATION', 'LOST'],
  NEGOTIATION: ['WON', 'LOST'],
  WON: [],
  LOST: ['CONTACTED']
};

const STAGE_PROBABILITY = {
  NEW: 10,
  CONTACTED: 25,
  QUALIFIED: 40,
  PROPOSAL: 60,
  NEGOTIATION: 80,
  WON: 100,
  LOST: 0
};

const LEAD_SOURCE = {
  WEBSITE: 'WEBSITE',
  REFERRAL: 'REFERRAL',
  COLD_CALL: 'COLD_CALL',
  EXHIBITION: 'EXHIBITION',
  EMAIL_CAMPAIGN: 'EMAIL_CAMPAIGN',
  SOCIAL_MEDIA: 'SOCIAL_MEDIA',
  PARTNER: 'PARTNER',
  OTHER: 'OTHER'
};

const CUSTOMER_STATUS = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE', ON_HOLD: 'ON_HOLD', BLACKLISTED: 'BLACKLISTED' };
const CUSTOMER_TYPE = { BUSINESS: 'BUSINESS', INDIVIDUAL: 'INDIVIDUAL', GOVERNMENT: 'GOVERNMENT' };
const CUSTOMER_SEGMENT = { ENTERPRISE: 'ENTERPRISE', SMB: 'SMB', STARTUP: 'STARTUP', GOVERNMENT: 'GOVERNMENT', RETAIL: 'RETAIL' };
const TAX_TREATMENT = { REGISTERED: 'REGISTERED', COMPOSITION: 'COMPOSITION', UNREGISTERED: 'UNREGISTERED', OVERSEAS: 'OVERSEAS', SEZ: 'SEZ' };
const ADDRESS_TYPE = { BILLING: 'BILLING', SHIPPING: 'SHIPPING', REGISTERED: 'REGISTERED' };
const ACTIVITY_TYPE = { CALL: 'CALL', EMAIL: 'EMAIL', MEETING: 'MEETING', NOTE: 'NOTE', TASK: 'TASK' };
const CREDIT_LOG_TYPE = { LIMIT_SET: 'LIMIT_SET', SALE: 'SALE', PAYMENT: 'PAYMENT', CREDIT_NOTE: 'CREDIT_NOTE', ADJUSTMENT: 'ADJUSTMENT', RELEASE: 'RELEASE' };

const QUEUE_NAMES = { CRM: 'crm.maintenance' };
const JOB_NAMES = { FOLLOWUP_SCAN: 'followup-scan', STALE_LEAD_SCAN: 'stale-lead-scan' };

const EVENTS = {
  LEAD_CREATED: 'crm.lead.created',
  LEAD_STAGE_CHANGED: 'crm.lead.stage_changed',
  LEAD_CONVERTED: 'crm.lead.converted',
  LEAD_STALE: 'crm.lead.stale',
  CUSTOMER_CREATED: 'crm.customer.created',
  CUSTOMER_UPDATED: 'crm.customer.updated',
  CUSTOMER_CREDIT_CHANGED: 'crm.customer.credit_changed',
  CUSTOMER_CREDIT_BREACHED: 'crm.customer.credit_breached',
  CUSTOMER_BLACKLISTED: 'crm.customer.blacklisted',
  FOLLOWUP_DUE: 'crm.followup.due'
};

const CACHE = {
  customerOptions: () => 'crm:customers:options',
  pipeline: () => 'crm:pipeline:summary',
  pattern: 'crm:*'
};

module.exports = {
  LEAD_STAGE, STAGE_TRANSITIONS, STAGE_PROBABILITY, LEAD_SOURCE,
  CATEGORY_MIME,
  CUSTOMER_STATUS, CUSTOMER_TYPE, CUSTOMER_SEGMENT, TAX_TREATMENT,
  ADDRESS_TYPE, ACTIVITY_TYPE, CREDIT_LOG_TYPE,
  QUEUE_NAMES, JOB_NAMES, EVENTS, CACHE
};
