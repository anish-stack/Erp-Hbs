'use strict';

const config = require('../config');

function layout(title, bodyHtml) {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f4f6f8;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#1f2933">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden">
        <tr><td style="background:#13246b;padding:20px 28px;color:#ffffff;font-size:18px;font-weight:600">${config.app.name}</td></tr>
        <tr><td style="padding:28px">
          <h2 style="margin:0 0 16px;font-size:20px;color:#13246b">${title}</h2>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:18px 28px;background:#f4f6f8;font-size:12px;color:#6b7280">
          This is an automated message from ${config.app.name}. Please do not reply.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = {
  welcome: ({ firstName, email, temporaryPassword }) => ({
    subject: `Welcome to ${config.app.name}`,
    html: layout('Your account is ready', `
      <p>Hi ${firstName},</p>
      <p>An account has been created for you.</p>
      <p><strong>Email:</strong> ${email}<br>
      ${temporaryPassword ? `<strong>Temporary password:</strong> ${temporaryPassword}` : ''}</p>
      <p>Sign in at <a href="${config.app.url}">${config.app.url}</a> and change your password immediately.</p>
    `)
  }),

  otp: ({ firstName, code, ttlMinutes, purpose }) => ({
    subject: `${code} is your ${config.app.name} verification code`,
    html: layout('Verification code', `
      <p>Hi ${firstName || 'there'},</p>
      <p>Use this code to complete your ${purpose.replace('_', ' ')} request:</p>
      <p style="font-size:30px;letter-spacing:8px;font-weight:700;color:#13246b;margin:20px 0">${code}</p>
      <p>The code expires in ${ttlMinutes} minutes. If you did not request it, ignore this email.</p>
    `)
  }),

  passwordReset: ({ firstName, resetUrl, ttlMinutes }) => ({
    subject: `Reset your ${config.app.name} password`,
    html: layout('Password reset requested', `
      <p>Hi ${firstName},</p>
      <p>Click below to set a new password. The link expires in ${ttlMinutes} minutes.</p>
      <p style="margin:24px 0">
        <a href="${resetUrl}" style="background:#13246b;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;display:inline-block">Reset password</a>
      </p>
      <p style="font-size:12px;color:#6b7280">If the button does not work, copy this link:<br>${resetUrl}</p>
    `)
  }),

  passwordChanged: ({ firstName, ipAddress, when }) => ({
    subject: `Your ${config.app.name} password was changed`,
    html: layout('Password changed', `
      <p>Hi ${firstName},</p>
      <p>Your password was changed on ${when}${ipAddress ? ` from IP ${ipAddress}` : ''}.</p>
      <p>All active sessions have been signed out. If this was not you, contact your administrator immediately.</p>
    `)
  }),

  accountLocked: ({ firstName, minutes, ipAddress }) => ({
    subject: `${config.app.name} account temporarily locked`,
    html: layout('Account locked', `
      <p>Hi ${firstName},</p>
      <p>Your account was locked for ${minutes} minutes after repeated failed sign-in attempts${ipAddress ? ` from IP ${ipAddress}` : ''}.</p>
      <p>If this was not you, reset your password immediately.</p>
    `)
  })
};
