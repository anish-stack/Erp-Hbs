'use strict';

const WAREHOUSE_TYPE = {
  MAIN: 'MAIN',
  BRANCH: 'BRANCH',
  TRANSIT: 'TRANSIT',
  QUARANTINE: 'QUARANTINE',
  RETURNS: 'RETURNS',
  VIRTUAL: 'VIRTUAL'
};

const WAREHOUSE_STATUS = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' };

const ZONE_TYPE = {
  RECEIVING: 'RECEIVING',
  STORAGE: 'STORAGE',
  DISPATCH: 'DISPATCH',
  QUARANTINE: 'QUARANTINE',
  RETURNS: 'RETURNS',
  STAGING: 'STAGING'
};

const BIN_TYPE = { SHELF: 'SHELF', PALLET: 'PALLET', DRAWER: 'DRAWER', REEL: 'REEL', TRAY: 'TRAY', BULK: 'BULK' };

const BIN_STATUS = { AVAILABLE: 'AVAILABLE', BLOCKED: 'BLOCKED', FULL: 'FULL', MAINTENANCE: 'MAINTENANCE' };

const PUTAWAY_STRATEGY = {
  FIXED: 'FIXED',
  NEAREST: 'NEAREST',
  ABC: 'ABC',
  MSL_MATCH: 'MSL_MATCH',
  MANUAL: 'MANUAL'
};

const TASK_TYPE = { PUTAWAY: 'PUTAWAY', PICK: 'PICK', MOVE: 'MOVE', COUNT: 'COUNT', REPLENISH: 'REPLENISH' };

const TASK_STATUS = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

const TASK_TRANSITIONS = {
  PENDING: ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'PENDING', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

const TASK_OPEN = [TASK_STATUS.PENDING, TASK_STATUS.ASSIGNED, TASK_STATUS.IN_PROGRESS];

const QUEUE_NAMES = { WAREHOUSE: 'warehouse.maintenance' };

const JOB_NAMES = {
  BIN_OCCUPANCY_SYNC: 'bin-occupancy-sync',
  STALE_TASK_SCAN: 'stale-task-scan'
};

const EVENTS = {
  WAREHOUSE_CREATED: 'warehouse.created',
  WAREHOUSE_UPDATED: 'warehouse.updated',
  WAREHOUSE_ACTIVATED: 'warehouse.activated',
  WAREHOUSE_DEACTIVATED: 'warehouse.deactivated',
  BIN_BLOCKED: 'warehouse.bin.blocked',
  BIN_FULL: 'warehouse.bin.full',
  TASK_CREATED: 'warehouse.task.created',
  TASK_ASSIGNED: 'warehouse.task.assigned',
  TASK_COMPLETED: 'warehouse.task.completed',
  PUTAWAY_COMPLETED: 'warehouse.putaway.completed',
  PICK_COMPLETED: 'warehouse.pick.completed'
};

const REF_TYPE = {
  GRN: 'GRN',
  INVENTORY_RECEIPT: 'INVENTORY_RECEIPT',
  SALES_ORDER: 'SALES_ORDER',
  SHIPMENT: 'SHIPMENT',
  MANUAL: 'MANUAL'
};

const CACHE = {
  warehouse: (id) => `warehouse:${id}`,
  options: () => 'warehouse:options',
  bins: (warehouseId) => `warehouse:${warehouseId}:bins`,
  pattern: 'warehouse:*'
};

module.exports = {
  WAREHOUSE_TYPE,
  WAREHOUSE_STATUS,
  ZONE_TYPE,
  BIN_TYPE,
  BIN_STATUS,
  PUTAWAY_STRATEGY,
  TASK_TYPE,
  TASK_STATUS,
  TASK_TRANSITIONS,
  TASK_OPEN,
  QUEUE_NAMES,
  JOB_NAMES,
  EVENTS,
  REF_TYPE,
  CACHE
};
