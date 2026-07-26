'use strict';

const { logger } = require('@erp/shared');
const config = require('../config');
const { CIRCUIT_STATE } = require('../constants');

/**
 * Per-upstream circuit breaker. Prevents hammering a dead microservice.
 */
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || config.circuit.failureThreshold;
    this.resetMs = options.resetMs || config.circuit.resetMs;
    this.state = CIRCUIT_STATE.CLOSED;
    this.failures = 0;
    this.openedAt = null;
  }

  canRequest() {
    if (this.state === CIRCUIT_STATE.CLOSED) return true;

    if (this.state === CIRCUIT_STATE.OPEN) {
      if (Date.now() - this.openedAt >= this.resetMs) {
        this.state = CIRCUIT_STATE.HALF_OPEN;
        logger.warn('Circuit half-open for upstream %s', this.name);
        return true;
      }
      return false;
    }

    return true;
  }

  onSuccess() {
    if (this.state !== CIRCUIT_STATE.CLOSED) {
      logger.info('Circuit closed for upstream %s', this.name);
    }
    this.state = CIRCUIT_STATE.CLOSED;
    this.failures = 0;
    this.openedAt = null;
  }

  onFailure() {
    this.failures += 1;
    if (this.state === CIRCUIT_STATE.HALF_OPEN || this.failures >= this.failureThreshold) {
      this.state = CIRCUIT_STATE.OPEN;
      this.openedAt = Date.now();
      logger.error(
        'Circuit opened for upstream %s after %d failures',
        this.name,
        this.failures
      );
    }
  }

  snapshot() {
    return {
      upstream: this.name,
      state: this.state,
      failures: this.failures,
      openedAt: this.openedAt ? new Date(this.openedAt).toISOString() : null
    };
  }
}

const registry = new Map();

function getBreaker(name) {
  if (!registry.has(name)) registry.set(name, new CircuitBreaker(name));
  return registry.get(name);
}

function snapshotAll() {
  return Array.from(registry.values()).map((breaker) => breaker.snapshot());
}

module.exports = { CircuitBreaker, getBreaker, snapshotAll };
