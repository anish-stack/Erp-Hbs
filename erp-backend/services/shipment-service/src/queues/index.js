'use strict';
const { logger } = require('@erp/shared');
const { shipmentQueue, scheduleRecurringJobs, createShipmentWorker } = require('./shipment.queue');
const workers = [];
function startWorkers() { workers.push(createShipmentWorker()); return workers; }
async function closeAll() {
  await Promise.all(workers.map((w) => w.close().catch(() => {})));
  await shipmentQueue.close().catch(() => {});
  logger.info('Shipment queue and workers closed');
}
module.exports = { startWorkers, closeAll, scheduleRecurringJobs, shipmentQueue };
