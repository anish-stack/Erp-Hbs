'use strict';

const SHIPMENT_STATUS = {
  PENDING: 'PENDING',
  PICKING: 'PICKING',
  PICKED: 'PICKED',
  PACKED: 'PACKED',
  DISPATCHED: 'DISPATCHED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
};

const SHIPMENT_TRANSITIONS = {
  PENDING: ['PICKING', 'CANCELLED'],
  PICKING: ['PICKED', 'CANCELLED'],
  PICKED: ['PACKED', 'CANCELLED'],
  PACKED: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: []
};

const OPEN_STATUSES = ['PENDING', 'PICKING', 'PICKED', 'PACKED'];

const QUEUE_NAMES = { SHIPMENT: 'shipment.maintenance' };
const JOB_NAMES = { STALE_SHIPMENT_SCAN: 'stale-shipment-scan' };

const EVENTS = {
  SHIPMENT_CREATED: 'shipment.created',
  SHIPMENT_PICKING: 'shipment.picking',
  SHIPMENT_PICKED: 'shipment.picked',
  SHIPMENT_PACKED: 'shipment.packed',
  SHIPMENT_DISPATCHED: 'shipment.dispatched',
  SHIPMENT_DELIVERED: 'shipment.delivered',
  SHIPMENT_CANCELLED: 'shipment.cancelled'
};

const REF_TYPE = { SHIPMENT: 'SHIPMENT' };

const CACHE = {
  shipment: (id) => `shipment:shipment:${id}`,
  pattern: 'shipment:*'
};

module.exports = {
  SHIPMENT_STATUS,
  SHIPMENT_TRANSITIONS,
  OPEN_STATUSES,
  QUEUE_NAMES,
  JOB_NAMES,
  EVENTS,
  REF_TYPE,
  CACHE
};
