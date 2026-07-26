'use strict';

const RFQ_STATUS = {
  DRAFT: 'DRAFT', SENT: 'SENT', QUOTING: 'QUOTING', QUOTED: 'QUOTED',
  COMPARED: 'COMPARED', AWARDED: 'AWARDED', CLOSED: 'CLOSED', CANCELLED: 'CANCELLED'
};

/**
 * Legal transitions. QUOTING/QUOTED are reached automatically as quotes
 * arrive (see RfqService.recomputeStatus), not via a direct API call, but
 * the map still governs what the API allows explicitly.
 */
const STATUS_TRANSITIONS = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['QUOTING', 'QUOTED', 'CANCELLED'],
  QUOTING: ['QUOTED', 'CANCELLED'],
  QUOTED: ['COMPARED', 'CANCELLED'],
  COMPARED: ['AWARDED', 'CANCELLED'],
  AWARDED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: []
};

const RFQ_SUPPLIER_STATUS = { PENDING: 'PENDING', RESPONDED: 'RESPONDED', DECLINED: 'DECLINED', EXPIRED: 'EXPIRED' };

const QUEUE_NAMES = { RFQ: 'rfq.maintenance' };
const JOB_NAMES = { DEADLINE_SCAN: 'deadline-scan' };

const EVENTS = {
  CREATED: 'rfq.created',
  SENT: 'rfq.sent',
  QUOTED: 'rfq.quoted',
  ALL_QUOTED: 'rfq.all_quoted',
  COMPARED: 'rfq.compared',
  AWARDED: 'rfq.awarded',
  CLOSED: 'rfq.closed',
  CANCELLED: 'rfq.cancelled',
  DEADLINE_MISSED: 'rfq.deadline_missed'
};

const CACHE = {
  rfq: (id) => `rfq:${id}`,
  pattern: 'rfq:*'
};

module.exports = { RFQ_STATUS, STATUS_TRANSITIONS, RFQ_SUPPLIER_STATUS, QUEUE_NAMES, JOB_NAMES, EVENTS, CACHE };
