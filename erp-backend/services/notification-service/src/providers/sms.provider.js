'use strict';

const { logger } = require('@erp/shared');
const config = require('../config');

/**
 * SMS is provider-agnostic by design: swap this stub for the real gateway
 * (e.g. MSG91, Twilio) by filling in the fetch call below. Disabled by
 * default (SMS_ENABLED=false) so the service runs cleanly without an account.
 */
async function sendSms({ to, message }) {
  if (!config.sms.enabled) return { sent: false, error: 'SMS channel disabled (SMS_ENABLED=false)' };
  if (!to) return { sent: false, error: 'No recipient phone on file' };
  if (config.sms.provider === 'none' || !config.sms.apiKey) {
    return { sent: false, error: 'No SMS provider configured (SMS_PROVIDER/SMS_API_KEY)' };
  }

  try {
    // Example shape for a generic HTTP SMS gateway; adapt to the real provider.
    logger.info('SMS dispatch to %s via %s (stub)', to, config.sms.provider);
    return { sent: true, providerRef: `stub-${Date.now()}` };
  } catch (err) {
    logger.error('SMS send failed to %s: %s', to, err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendSms };
