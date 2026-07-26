'use strict';

const amqplib = require('amqplib');
const { randomUUID } = require('crypto');
const env = require('../config/env');
const logger = require('../logger');

const EXCHANGE = env.str('RABBITMQ_EXCHANGE', 'erp.events');
const DLX = env.str('RABBITMQ_DLX', 'erp.events.dlx');
const PREFETCH = env.int('RABBITMQ_PREFETCH', 10);
const MAX_RETRY = env.int('RABBITMQ_MAX_RETRY', 3);

let connection = null;
let publishChannel = null;
let connecting = null;
const consumers = [];

async function createConnection() {
  const url = env.required('RABBITMQ_URL');
  const conn = await amqplib.connect(url, { heartbeat: 20 });

  conn.on('error', (err) => logger.error('RabbitMQ connection error: %s', err.message));
  conn.on('close', () => {
    logger.warn('RabbitMQ connection closed, reconnecting in 5s');
    connection = null;
    publishChannel = null;
    setTimeout(() => {
      connect().catch((err) => logger.error('RabbitMQ reconnect failed: %s', err.message));
    }, 5000);
  });

  return conn;
}

async function connect() {
  if (connection && publishChannel) return { connection, channel: publishChannel };
  if (connecting) return connecting;

  connecting = (async () => {
    connection = await createConnection();
    publishChannel = await connection.createConfirmChannel();

    await publishChannel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await publishChannel.assertExchange(DLX, 'topic', { durable: true });

    logger.info('RabbitMQ connected (exchange: %s)', EXCHANGE);

    for (const registration of consumers) {
      await bindConsumer(registration);
    }

    connecting = null;
    return { connection, channel: publishChannel };
  })();

  return connecting;
}

/**
 * Publishes a domain event to the topic exchange.
 * @param {string} routingKey canonical event name (see events.js)
 * @param {object} payload   serialisable event body
 * @param {object} options   { correlationId, userId, tenantId }
 */
async function publish(routingKey, payload = {}, options = {}) {
  if (!publishChannel) await connect();

  const message = {
    eventId: randomUUID(),
    event: routingKey,
    occurredAt: new Date().toISOString(),
    source: env.str('SERVICE_NAME', 'erp-service'),
    correlationId: options.correlationId || randomUUID(),
    actor: options.userId || null,
    data: payload
  };

  const buffer = Buffer.from(JSON.stringify(message));

  return new Promise((resolve, reject) => {
    publishChannel.publish(
      EXCHANGE,
      routingKey,
      buffer,
      {
        persistent: true,
        contentType: 'application/json',
        messageId: message.eventId,
        correlationId: message.correlationId,
        timestamp: Date.now(),
        headers: { 'x-retry-count': 0 }
      },
      (err) => {
        if (err) {
          logger.error('RabbitMQ publish failed [%s]: %s', routingKey, err.message);
          return reject(err);
        }
        logger.info('Event published [%s] id=%s', routingKey, message.eventId);
        return resolve(message.eventId);
      }
    );
  });
}

async function bindConsumer({ queue, patterns, handler }) {
  const channel = await connection.createChannel();
  await channel.prefetch(PREFETCH);

  const retryQueue = `${queue}.retry`;
  const deadQueue = `${queue}.dead`;

  await channel.assertQueue(deadQueue, { durable: true });
  await channel.bindQueue(deadQueue, DLX, queue);

  await channel.assertQueue(retryQueue, {
    durable: true,
    deadLetterExchange: EXCHANGE,
    messageTtl: env.int('RABBITMQ_RETRY_DELAY_MS', 10000)
  });

  await channel.assertQueue(queue, {
    durable: true,
    deadLetterExchange: DLX,
    deadLetterRoutingKey: queue
  });

  for (const pattern of patterns) {
    await channel.bindQueue(queue, EXCHANGE, pattern);
  }

  await channel.consume(queue, async (msg) => {
    if (!msg) return;
    let parsed;
    try {
      parsed = JSON.parse(msg.content.toString());
    } catch (err) {
      logger.error('Malformed event on %s, discarding: %s', queue, err.message);
      return channel.ack(msg);
    }

    const retryCount = Number((msg.properties.headers || {})['x-retry-count'] || 0);

    try {
      await handler(parsed, msg);
      channel.ack(msg);
      logger.info('Event handled [%s] queue=%s id=%s', parsed.event, queue, parsed.eventId);
    } catch (err) {
      logger.error(
        'Event handler failed [%s] queue=%s attempt=%d: %s',
        parsed.event,
        queue,
        retryCount + 1,
        err.message
      );

      if (retryCount + 1 >= MAX_RETRY) {
        channel.nack(msg, false, false);
        return;
      }

      channel.sendToQueue(retryQueue, msg.content, {
        persistent: true,
        contentType: 'application/json',
        messageId: msg.properties.messageId,
        correlationId: msg.properties.correlationId,
        headers: { 'x-retry-count': retryCount + 1 },
        expiration: undefined
      });
      channel.ack(msg);
    }
  });

  logger.info('Consumer bound: queue=%s patterns=%s', queue, patterns.join(','));
  return channel;
}

/**
 * Registers a durable consumer. Safe to call before connect().
 * @param {string} queue    durable queue name (service scoped)
 * @param {string[]} patterns topic patterns e.g. ['purchase.*', 'inventory.updated']
 * @param {Function} handler async (event, rawMessage) => void
 */
async function subscribe(queue, patterns, handler) {
  const registration = { queue, patterns, handler };
  consumers.push(registration);
  if (connection) await bindConsumer(registration);
  return registration;
}

function isConnected() {
  return Boolean(connection && publishChannel);
}

async function close() {
  if (publishChannel) await publishChannel.close().catch(() => {});
  if (connection) await connection.close().catch(() => {});
  connection = null;
  publishChannel = null;
}

module.exports = { connect, publish, subscribe, isConnected, close, EXCHANGE, DLX };
