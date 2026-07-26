'use strict';

const { broker, logger } = require('@erp/shared');
const TaskService = require('../services/task.service');
const config = require('../config');

const QUEUE = 'warehouse-service.events';

/**
 * Warehouse reacts to inventory receipts by opening a putaway task so floor
 * staff move the goods from the receiving zone into a storage bin. The event
 * carries enough detail (warehouseId, partId, quantity) to seed the task.
 */
async function handle(event) {
  const data = event.data || {};

  switch (event.event) {
    case 'inventory.receipt.posted':
      if (!config.autoPutawayTasks) return;
      await TaskService.autoPutaway(
        {
          warehouseId: data.warehouseId,
          partId: data.partId,
          partCode: data.partCode,
          quantity: Number(data.quantity) || 0,
          refType: data.refType || 'INVENTORY_RECEIPT',
          refId: data.refId || data.movementId || null
        },
        event.actor
      );
      logger.info('Putaway task seeded for part %s in warehouse %s', data.partId, data.warehouseId);
      break;

    default:
      return;
  }
}

async function registerConsumers() {
  await broker.subscribe(QUEUE, ['inventory.receipt.posted'], handle);
  logger.info('Warehouse consumers registered on queue %s', QUEUE);
}

module.exports = { registerConsumers, QUEUE, handle };
