'use strict';

const LOT_STATUS = {
  AVAILABLE: 'AVAILABLE',
  QUARANTINE: 'QUARANTINE',
  CONSUMED: 'CONSUMED',
  EXPIRED: 'EXPIRED',
  BLOCKED: 'BLOCKED'
};

const MOVEMENT_TYPE = {
  RECEIPT: 'RECEIPT',
  ISSUE: 'ISSUE',
  ADJUSTMENT_IN: 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT: 'ADJUSTMENT_OUT',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFER_OUT: 'TRANSFER_OUT',
  RESERVE: 'RESERVE',
  RELEASE: 'RELEASE',
  SCRAP: 'SCRAP',
  RETURN: 'RETURN',
  QUARANTINE_IN: 'QUARANTINE_IN',
  QUARANTINE_RELEASE: 'QUARANTINE_RELEASE',
  OPENING: 'OPENING'
};

/// Sign each movement type applies to on-hand balance.
const MOVEMENT_DIRECTION = {
  RECEIPT: 1,
  ISSUE: -1,
  ADJUSTMENT_IN: 1,
  ADJUSTMENT_OUT: -1,
  TRANSFER_IN: 1,
  TRANSFER_OUT: -1,
  RESERVE: 0,
  RELEASE: 0,
  SCRAP: -1,
  RETURN: 1,
  QUARANTINE_IN: 0,
  QUARANTINE_RELEASE: 0,
  OPENING: 1
};

const RESERVATION_STATUS = {
  ACTIVE: 'ACTIVE',
  PARTIALLY_FULFILLED: 'PARTIALLY_FULFILLED',
  FULFILLED: 'FULFILLED',
  RELEASED: 'RELEASED',
  EXPIRED: 'EXPIRED'
};

const RESERVATION_OPEN = [RESERVATION_STATUS.ACTIVE, RESERVATION_STATUS.PARTIALLY_FULFILLED];

const ADJUSTMENT_TYPE = {
  CYCLE_COUNT: 'CYCLE_COUNT',
  DAMAGE: 'DAMAGE',
  WRITE_OFF: 'WRITE_OFF',
  REVALUATION: 'REVALUATION',
  OPENING_BALANCE: 'OPENING_BALANCE'
};

const ADJUSTMENT_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  POSTED: 'POSTED',
  REJECTED: 'REJECTED'
};

const ADJUSTMENT_TRANSITIONS = {
  DRAFT: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'DRAFT'],
  APPROVED: ['POSTED'],
  POSTED: [],
  REJECTED: ['DRAFT']
};

const VALUATION_METHOD = {
  MOVING_AVERAGE: 'MOVING_AVERAGE',
  STANDARD: 'STANDARD'
};

const QUEUE_NAMES = { INVENTORY: 'inventory.maintenance' };

const JOB_NAMES = {
  LOW_STOCK_SCAN: 'low-stock-scan',
  RESERVATION_SWEEP: 'reservation-sweep',
  LOT_EXPIRY_SCAN: 'lot-expiry-scan'
};

/// Events this service publishes.
const EVENTS = {
  STOCK_UPDATED: 'inventory.stock.updated',
  MOVEMENT_CREATED: 'inventory.movement.created',
  RECEIPT_POSTED: 'inventory.receipt.posted',
  ISSUE_POSTED: 'inventory.issue.posted',
  LOW_STOCK: 'inventory.stock.low',
  OUT_OF_STOCK: 'inventory.stock.out',
  RESERVED: 'inventory.reservation.created',
  RESERVATION_RELEASED: 'inventory.reservation.released',
  RESERVATION_FAILED: 'inventory.reservation.failed',
  ADJUSTMENT_POSTED: 'inventory.adjustment.posted',
  LOT_EXPIRING: 'inventory.lot.expiring'
};

const REF_TYPE = {
  GRN: 'GRN',
  SALES_ORDER: 'SALES_ORDER',
  SHIPMENT: 'SHIPMENT',
  ADJUSTMENT: 'ADJUSTMENT',
  TRANSFER: 'TRANSFER',
  QUALITY: 'QUALITY',
  MANUAL: 'MANUAL'
};

const CACHE = {
  stock: (id) => `inventory:stock:${id}`,
  partStock: (partId) => `inventory:part:${partId}`,
  lowStock: () => 'inventory:lowstock',
  valuation: () => 'inventory:valuation',
  pattern: 'inventory:*'
};

module.exports = {
  LOT_STATUS,
  MOVEMENT_TYPE,
  MOVEMENT_DIRECTION,
  RESERVATION_STATUS,
  RESERVATION_OPEN,
  ADJUSTMENT_TYPE,
  ADJUSTMENT_STATUS,
  ADJUSTMENT_TRANSITIONS,
  VALUATION_METHOD,
  QUEUE_NAMES,
  JOB_NAMES,
  EVENTS,
  REF_TYPE,
  CACHE
};
