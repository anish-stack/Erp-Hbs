'use strict';

const nodemailer = require('nodemailer');
const { logger } = require('@erp/shared');
const config = require('../config');

let transporter = null;

function getTransporter() {
  if (!config.mail.enabled) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined
  });
  return transporter;
}

/** Sends an email; returns { sent, providerRef } or { sent: false, error }. */
async function sendMail({ to, subject, text, html }) {
  if (!config.mail.enabled) return { sent: false, error: 'Email channel disabled (EMAIL_ENABLED=false)' };
  if (!to) return { sent: false, error: 'No recipient email on file' };

  const t = getTransporter();
  try {
    const info = await t.sendMail({ from: config.mail.from, to, subject, text, html: html || `<p>${text}</p>` });
    return { sent: true, providerRef: info.messageId };
  } catch (err) {
    logger.error('Email send failed to %s: %s', to, err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendMail };
