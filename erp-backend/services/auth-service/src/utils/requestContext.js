'use strict';

/** Normalised client context attached to every auth operation. */
module.exports = function contextOf(req) {
  return {
    ipAddress: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip,
    userAgent: req.headers['user-agent'] || null,
    requestId: req.id
  };
};
