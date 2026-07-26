'use strict';

const nodemailer = require('nodemailer');
const { logger } = require('@erp/shared');
const config = require('../config');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!config.mail.host) {
    logger.warn('SMTP not configured - emails will be logged instead of sent');
    transporter = {
      sendMail: async (message) => {
        logger.info('Email (dev mode) to=%s subject=%s', message.to, message.subject);
        return { messageId: 'dev-mode', accepted: [message.to] };
      }
    };
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.password } : undefined,
    pool: true,
    maxConnections: 3
  });

  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const info = await getTransporter().sendMail({
    from: `"${config.mail.fromName}" <${config.mail.fromAddress}>`,
    to,
    subject,
    text: text || String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    html
  });
  logger.info('Email sent to=%s subject=%s id=%s', to, subject, info.messageId);
  return info;
}

module.exports = { sendMail, getTransporter };
