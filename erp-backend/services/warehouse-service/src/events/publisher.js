'use strict';

const { broker, logger } = require('@erp/shared');
const { EVENTS } = require('../constants');

async function emit(routingKey, payload, actorId) {
  try {
    return await broker.publish(routingKey, payload, { userId: actorId });
  } catch (err) {
    logger.error('Event emit failed [%s]: %s', routingKey, err.message);
    return null;
  }
}

function baseWh(w) {
  return { warehouseId: w.id, code: w.code, name: w.name, type: w.type, status: w.status };
}

function baseTask(t) {
  return {
    taskId: t.id,
    code: t.code,
    warehouseId: t.warehouseId,
    type: t.type,
    partId: t.partId,
    quantity: String(t.quantity),
    fromBinCode: t.fromBinCode,
    toBinCode: t.toBinCode,
    refType: t.refType,
    refId: t.refId
  };
}

module.exports = {
  warehouseCreated: (w, actorId) => emit(EVENTS.WAREHOUSE_CREATED, baseWh(w), actorId),
  warehouseUpdated: (w, changes, actorId) => emit(EVENTS.WAREHOUSE_UPDATED, { ...baseWh(w), changes }, actorId),
  warehouseActivated: (w, actorId) => emit(EVENTS.WAREHOUSE_ACTIVATED, baseWh(w), actorId),
  warehouseDeactivated: (w, actorId) => emit(EVENTS.WAREHOUSE_DEACTIVATED, baseWh(w), actorId),

  binBlocked: (bin, reason) =>
    emit(EVENTS.BIN_BLOCKED, { binId: bin.id, code: bin.code, warehouseId: bin.warehouseId, reason, severity: 'WARNING' }),

  taskCreated: (t, actorId) => emit(EVENTS.TASK_CREATED, baseTask(t), actorId),
  taskAssigned: (t, actorId) => emit(EVENTS.TASK_ASSIGNED, { ...baseTask(t), assignedTo: t.assignedTo }, actorId),
  taskCompleted: (t, actorId) => emit(EVENTS.TASK_COMPLETED, baseTask(t), actorId),
  putawayCompleted: (t, actorId) => emit(EVENTS.PUTAWAY_COMPLETED, baseTask(t), actorId),
  pickCompleted: (t, actorId) => emit(EVENTS.PICK_COMPLETED, baseTask(t), actorId),

  emit
};
