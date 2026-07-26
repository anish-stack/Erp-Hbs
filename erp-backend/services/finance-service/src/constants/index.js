'use strict';

const INVOICE_TYPE = { SALES: 'SALES', PURCHASE: 'PURCHASE' };

const INVOICE_STATUS = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED'
};

const INVOICE_TRANSITIONS = {
  DRAFT: ['ISSUED', 'CANCELLED'],
  ISSUED: ['PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'],
  PARTIALLY_PAID: ['PAID', 'OVERDUE', 'CANCELLED'],
  OVERDUE: ['PARTIALLY_PAID', 'PAID', 'CANCELLED'],
  PAID: [],
  CANCELLED: []
};

const PAYABLE_STATUSES = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'];

const PARTY_TYPE = { CUSTOMER: 'CUSTOMER', SUPPLIER: 'SUPPLIER' };
const SOURCE_TYPE = { SALES_ORDER: 'SALES_ORDER', PURCHASE_ORDER: 'PURCHASE_ORDER', GRN: 'GRN', MANUAL: 'MANUAL' };
const PAYMENT_DIRECTION = { INBOUND: 'INBOUND', OUTBOUND: 'OUTBOUND' };
const PAYMENT_METHOD = { CASH: 'CASH', BANK: 'BANK', UPI: 'UPI', CHEQUE: 'CHEQUE', CARD: 'CARD', RAZORPAY: 'RAZORPAY', ADJUSTMENT: 'ADJUSTMENT' };
const PAYMENT_STATUS = { PENDING: 'PENDING', COMPLETED: 'COMPLETED', FAILED: 'FAILED', REFUNDED: 'REFUNDED' };

const QUEUE_NAMES = { FINANCE: 'finance.maintenance' };
const JOB_NAMES = { OVERDUE_SCAN: 'invoice-overdue-scan' };

const EVENTS = {
  INVOICE_CREATED: 'finance.invoice.created',
  INVOICE_ISSUED: 'finance.invoice.issued',
  INVOICE_PAID: 'finance.invoice.paid',
  INVOICE_CANCELLED: 'finance.invoice.cancelled',
  INVOICE_OVERDUE: 'finance.invoice.overdue',
  PAYMENT_RECORDED: 'finance.payment.recorded',
  PAYMENT_REFUNDED: 'finance.payment.refunded'
};

const CACHE = {
  invoice: (id) => `finance:invoice:${id}`,
  payment: (id) => `finance:payment:${id}`,
  pattern: 'finance:*'
};

module.exports = {
  INVOICE_TYPE,
  INVOICE_STATUS,
  INVOICE_TRANSITIONS,
  PAYABLE_STATUSES,
  PARTY_TYPE,
  SOURCE_TYPE,
  PAYMENT_DIRECTION,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  QUEUE_NAMES,
  JOB_NAMES,
  EVENTS,
  CACHE
};
