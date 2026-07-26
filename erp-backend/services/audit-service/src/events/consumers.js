'use strict';

const { broker, logger } = require('@erp/shared');
const IngestService = require('../services/ingest.service');

const QUEUE = 'audit-service.events';

/**
 * The audit trail subscribes to every event on the exchange.
 * '#' is the AMQP topic wildcard for "one or more segments", so any future
 * service is captured without touching this file.
 */
async function registerConsumers() {
  await broker.subscribe(QUEUE, ['#'], async (envelope) => {
    try {
      await IngestService.fromEvent(envelope);
    } catch (err) {
      logger.error('Audit ingest failed [%s]: %s', envelope && envelope.event, err.message);
      await IngestService.recordFailure(envelope, err);
      throw err;
    }
  });

  logger.info('Audit consumer bound to all events on queue %s', QUEUE);
}

module.exports = { registerConsumers, QUEUE };
