'use strict';

const INSPECTION_TYPE = { INCOMING: 'INCOMING', IN_PROCESS: 'IN_PROCESS', FINAL: 'FINAL', RETURN: 'RETURN' };

const INSPECTION_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  PARTIAL: 'PARTIAL',
  ON_HOLD: 'ON_HOLD',
  CANCELLED: 'CANCELLED'
};

const STATUS_TRANSITIONS = {
  PENDING: ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  IN_PROGRESS: ['PASSED', 'FAILED', 'PARTIAL', 'ON_HOLD', 'CANCELLED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  PASSED: [],
  FAILED: [],
  PARTIAL: [],
  CANCELLED: []
};

const TERMINAL = ['PASSED', 'FAILED', 'PARTIAL', 'CANCELLED'];

const SAMPLING_PLAN = { NONE: 'NONE', FULL: 'FULL', SAMPLE: 'SAMPLE', AQL: 'AQL' };

const DISPOSITION = {
  ACCEPT: 'ACCEPT',
  REJECT: 'REJECT',
  REWORK: 'REWORK',
  RETURN_TO_SUPPLIER: 'RETURN_TO_SUPPLIER',
  USE_AS_IS: 'USE_AS_IS',
  SCRAP: 'SCRAP'
};

const DEFECT_SEVERITY = { MINOR: 'MINOR', MAJOR: 'MAJOR', CRITICAL: 'CRITICAL' };
const RESULT_FLAG = { PASS: 'PASS', FAIL: 'FAIL' };

const QUEUE_NAMES = { QUALITY: 'quality.maintenance' };
const JOB_NAMES = { STALE_INSPECTION_SCAN: 'stale-inspection-scan' };

const EVENTS = {
  INSPECTION_CREATED: 'quality.inspection.created',
  INSPECTION_STARTED: 'quality.inspection.started',
  INSPECTION_PASSED: 'quality.inspection.passed',
  INSPECTION_FAILED: 'quality.inspection.failed',
  INSPECTION_PARTIAL: 'quality.inspection.partial',
  NCR_RAISED: 'quality.ncr.raised'
};

const REF_TYPE = { GRN: 'GRN', RETURN: 'RETURN', MANUAL: 'MANUAL' };

const CACHE = {
  inspection: (id) => `quality:inspection:${id}`,
  plans: () => 'quality:plans',
  pattern: 'quality:*'
};

module.exports = {
  INSPECTION_TYPE,
  INSPECTION_STATUS,
  STATUS_TRANSITIONS,
  TERMINAL,
  SAMPLING_PLAN,
  DISPOSITION,
  DEFECT_SEVERITY,
  RESULT_FLAG,
  QUEUE_NAMES,
  JOB_NAMES,
  EVENTS,
  REF_TYPE,
  CACHE
};
