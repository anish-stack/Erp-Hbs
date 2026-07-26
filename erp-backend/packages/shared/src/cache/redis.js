'use strict';

const Redis = require('ioredis');
const env = require('../config/env');
const logger = require('../logger');

let client = null;
let connected = false;

function buildOptions() {
  return {
    host: env.str('REDIS_HOST', '127.0.0.1'),
    port: env.int('REDIS_PORT', 6379),
    password: env.str('REDIS_PASSWORD', '') || undefined,
    db: env.int('REDIS_DB', 0),
    keyPrefix: env.str('REDIS_KEY_PREFIX', 'erp:'),
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 500, 10000)
  };
}

async function connect() {
  if (client && connected) return client;
  client = new Redis(buildOptions());

  client.on('ready', () => {
    connected = true;
    logger.info('Redis connected');
  });
  client.on('error', (err) => {
    connected = false;
    logger.error('Redis error: %s', err.message);
  });
  client.on('end', () => {
    connected = false;
    logger.warn('Redis connection closed');
  });

  await client.connect();
  return client;
}

function getClient() {
  if (!client) throw new Error('Redis not initialised. Call cache.connect() first.');
  return client;
}

function isConnected() {
  return connected;
}

async function get(key) {
  const raw = await getClient().get(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return raw;
  }
}

async function set(key, value, ttlSeconds = 0) {
  const payload = typeof value === 'string' ? value : JSON.stringify(value);
  if (ttlSeconds > 0) return getClient().set(key, payload, 'EX', ttlSeconds);
  return getClient().set(key, payload);
}

async function del(...keys) {
  if (!keys.length) return 0;
  return getClient().del(...keys);
}

async function exists(key) {
  return (await getClient().exists(key)) === 1;
}

async function incr(key, ttlSeconds = 0) {
  const value = await getClient().incr(key);
  if (ttlSeconds > 0 && value === 1) await getClient().expire(key, ttlSeconds);
  return value;
}

async function ttl(key) {
  return getClient().ttl(key);
}

/** Deletes by pattern using SCAN (never KEYS) so production is not blocked. */
async function delByPattern(pattern) {
  const redis = getClient();
  const prefix = env.str('REDIS_KEY_PREFIX', 'erp:');
  const match = `${prefix}${pattern}`;
  let cursor = '0';
  let removed = 0;
  do {
    const [next, found] = await redis.scan(cursor, 'MATCH', match, 'COUNT', 200);
    cursor = next;
    if (found.length) {
      const unprefixed = found.map((k) => k.slice(prefix.length));
      removed += await redis.del(...unprefixed);
    }
  } while (cursor !== '0');
  return removed;
}

/** Cache-aside helper. */
async function remember(key, ttlSeconds, resolver) {
  const cached = await get(key);
  if (cached !== null) return cached;
  const fresh = await resolver();
  if (fresh !== undefined && fresh !== null) await set(key, fresh, ttlSeconds);
  return fresh;
}

async function ping() {
  if (!client) return false;
  try {
    const res = await client.ping();
    return res === 'PONG';
  } catch (err) {
    return false;
  }
}

async function disconnect() {
  if (!client) return;
  await client.quit();
  client = null;
  connected = false;
}

module.exports = {
  connect,
  getClient,
  isConnected,
  get,
  set,
  del,
  exists,
  incr,
  ttl,
  delByPattern,
  remember,
  ping,
  disconnect
};
