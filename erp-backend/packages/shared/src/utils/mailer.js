"use strict";
const nodemailer = require("nodemailer");
const config = require("../config/env"); // adjust path if needed

config.load(); // ensure .env is parsed into process.env

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: config.str("SMTP_HOST"),
    port: config.int("SMTP_PORT", 587),
    secure: config.bool("SMTP_SECURE", false),
    auth: {
      user: config.str("SMTP_USER"),
      pass: config.str("SMTP_PASS"),
    },
    connectionTimeout: 10000, // fail fast if SMTP host unreachable
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return transporter;
}

const mailer = {
  async send({ to, subject, html, text, attachments }) {
    if (!to) throw new Error("mailer.send: 'to' is required");

    const t = getTransporter();
    const from =
      config.str("SMTP_FROM") ||
      '"Hover Business Services" <no-reply@hovermedia.in>';

    return t.sendMail({
      from,
      to,
      subject,
      html,
      text: text || undefined,
      attachments: attachments || undefined,
    });
  },
};

module.exports = mailer;