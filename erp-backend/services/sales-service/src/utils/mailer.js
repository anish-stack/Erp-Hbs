"use strict";
const nodemailer = require("nodemailer");
const config = require("../config"); // structured app config — already has config.mail.{host,port,secure,user,pass,from}

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const mail = config.mail || {};

  transporter = nodemailer.createTransport({
    host: mail.host,
    port: Number(mail.port || 587),
    secure: !!mail.secure,
    auth: {
      user: mail.user,
      pass: mail.pass,
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

    const mail = config.mail || {};
    const t = getTransporter();
    const from = mail.from || '"Hover Business Services" <no-reply@hovermedia.in>';

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