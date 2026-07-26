'use strict';

const { logger } = require('@erp/shared');
const AuditRepository = require('../repositories/audit.repository');
const SummaryRepository = require('../repositories/summary.repository');
const config = require('../config');

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

class RollupService {
  /** Aggregates one calendar day into audit_summaries. Defaults to yesterday. */
  static async runDaily(targetDate = null) {
    const day = startOfDay(targetDate || new Date(Date.now() - 86400000));
    const next = new Date(day.getTime() + 86400000);

    const rows = await AuditRepository.dailyCounts(day, next);

    let written = 0;
    for (const row of rows) {
      await SummaryRepository.upsertDaily({
        day: new Date(row.day),
        entity: String(row.entity).slice(0, 60),
        action: String(row.action).slice(0, 30),
        total: Number(row.total),
        actorCount: Number(row.actors)
      });
      written += 1;
    }

    logger.info('Audit rollup for %s wrote %d summary rows', day.toISOString().slice(0, 10), written);
    return { day: day.toISOString().slice(0, 10), rows: written };
  }

  /** Deletes entries beyond the retention window (default 2 years). */
  static async purgeRetention() {
    const cutoff = new Date(Date.now() - config.retention.days * 86400000);
    const removed = await AuditRepository.purgeOlderThan(cutoff);

    logger.warn(
      'Audit retention purge removed %d entries older than %s',
      removed,
      cutoff.toISOString().slice(0, 10)
    );

    return { removed, cutoff };
  }
}

module.exports = RollupService;
