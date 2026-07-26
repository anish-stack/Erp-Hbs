'use strict';
const { broker, logger } = require('@erp/shared');
const { EVENTS } = require('../constants');

async function emit(routingKey, payload, actorId) {
  try { return await broker.publish(routingKey, payload, { userId: actorId }); }
  catch (err) { logger.error('Event emit failed [%s]: %s', routingKey, err.message); return null; }
}

module.exports = {
  completed: (run, actorId) => emit(EVENTS.REPORT_COMPLETED, {
    runId: run.id, reportKey: run.reportKey, reportName: run.reportName,
    fileId: run.fileId, rowCount: run.rowCount, requestedBy: run.requestedBy, assignedTo: run.requestedBy
  }, actorId),
  failed: (run, actorId) => emit(EVENTS.REPORT_FAILED, {
    runId: run.id, reportKey: run.reportKey, reportName: run.reportName,
    error: run.error, requestedBy: run.requestedBy, assignedTo: run.requestedBy, severity: 'WARNING'
  }, actorId),
  emit
};
