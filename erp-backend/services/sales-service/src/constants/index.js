'use strict';

const QUOTATION_STATUS = {
  DRAFT: 'DRAFT', SENT: 'SENT', ACCEPTED: 'ACCEPTED', REJECTED: 'REJECTED', EXPIRED: 'EXPIRED', CONVERTED: 'CONVERTED'
};

const QUOTATION_TRANSITIONS = {
  DRAFT: ['SENT', 'REJECTED'],
  SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
  ACCEPTED: ['CONVERTED'],
  REJECTED: ['DRAFT'],
  EXPIRED: ['DRAFT'],
  CONVERTED: []
};

const ORDER_STATUS = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  PARTIALLY_FULFILLED: 'PARTIALLY_FULFILLED',
  FULFILLED: 'FULFILLED',
  CANCELLED: 'CANCELLED',
  CLOSED: 'CLOSED'
};

const ORDER_TRANSITIONS = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED'],
  PARTIALLY_FULFILLED: ['FULFILLED', 'CANCELLED'],
  FULFILLED: ['CLOSED'],
  CANCELLED: [],
  CLOSED: []
};

const ORDER_EDITABLE = [ORDER_STATUS.DRAFT];
const ORDER_ACTIVE = [ORDER_STATUS.CONFIRMED, ORDER_STATUS.PARTIALLY_FULFILLED];

const QUEUE_NAMES = { SALES: 'sales.maintenance' };
const JOB_NAMES = { QUOTATION_EXPIRY_SCAN: 'quotation-expiry-scan' };

const EVENTS = {
  QUOTATION_CREATED: 'sales.quotation.created',
  QUOTATION_SENT: 'sales.quotation.sent',
  QUOTATION_ACCEPTED: 'sales.quotation.accepted',
  QUOTATION_CONVERTED: 'sales.quotation.converted',
  ORDER_CREATED: 'sales.order.created',
  ORDER_CONFIRMED: 'sales.order.confirmed',
  ORDER_CANCELLED: 'sales.order.cancelled',
  ORDER_FULFILLED: 'sales.order.fulfilled',
  ORDER_PARTIAL: 'sales.order.partially_fulfilled',
  ORDER_CLOSED: 'sales.order.closed',
  RESERVATION_SHORTFALL: 'sales.order.reservation_shortfall'
};

const REF_TYPE = { SALES_ORDER: 'SALES_ORDER' };

const CACHE = {
  quotation: (id) => `sales:quotation:${id}`,
  order: (id) => `sales:order:${id}`,
  pattern: 'sales:*'
};

module.exports = {
  QUOTATION_STATUS,
  QUOTATION_TRANSITIONS,
  ORDER_STATUS,
  ORDER_TRANSITIONS,
  ORDER_EDITABLE,
  ORDER_ACTIVE,
  QUEUE_NAMES,
  JOB_NAMES,
  EVENTS,
  REF_TYPE,
  CACHE
};
