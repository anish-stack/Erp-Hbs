"use strict";

function fmtMoney(v, currencyCode) {
  const n = Number(v || 0);
  return `${currencyCode || "INR"} ${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function baseLayout(title, bodyHtml) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#0f172a;padding:20px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:bold;">Hover Business Services</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#f9fafb;color:#9ca3af;font-size:12px;">
                This is an automated email. Please do not reply directly to this message.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(url, label, color) {
  return `<a href="${url}" target="_blank" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:bold;margin-right:12px;">${label}</a>`;
}

const emailTemplates = {
  quotationSent(quotation, links) {
    const rows = (quotation.lines || [])
      .map(
        (l) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:13px;">${l.description || l.partCode || ""}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">${l.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;">${fmtMoney(l.unitPrice, quotation.currencyCode)}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;">${fmtMoney(l.lineTotal, quotation.currencyCode)}</td>
        </tr>`,
      )
      .join("");

    const body = `
      <p style="font-size:15px;color:#111827;">Dear ${quotation.customerName || "Customer"},</p>
      <p style="font-size:14px;color:#374151;line-height:1.6;">
        Please find below the quotation <strong>${quotation.code}</strong> from Hover Business Services.
        It is valid until <strong>${new Date(quotation.validUntil).toLocaleDateString("en-IN")}</strong>.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #e5e7eb;border-radius:6px;">
        <tr style="background:#f3f4f6;">
          <td style="padding:8px;font-size:12px;font-weight:bold;">Description</td>
          <td style="padding:8px;font-size:12px;font-weight:bold;text-align:center;">Qty</td>
          <td style="padding:8px;font-size:12px;font-weight:bold;text-align:right;">Unit Price</td>
          <td style="padding:8px;font-size:12px;font-weight:bold;text-align:right;">Total</td>
        </tr>
        ${rows}
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td align="right" style="font-size:13px;color:#374151;padding:2px 8px;">Subtotal:</td>
          <td align="right" style="font-size:13px;color:#374151;width:120px;">${fmtMoney(quotation.subtotal, quotation.currencyCode)}</td>
        </tr>
        <tr>
          <td align="right" style="font-size:13px;color:#374151;padding:2px 8px;">Discount:</td>
          <td align="right" style="font-size:13px;color:#374151;">${fmtMoney(quotation.discountTotal, quotation.currencyCode)}</td>
        </tr>
        <tr>
          <td align="right" style="font-size:13px;color:#374151;padding:2px 8px;">Tax:</td>
          <td align="right" style="font-size:13px;color:#374151;">${fmtMoney(quotation.taxTotal, quotation.currencyCode)}</td>
        </tr>
        <tr>
          <td align="right" style="font-size:15px;color:#111827;font-weight:bold;padding:6px 8px;border-top:1px solid #e5e7eb;">Grand Total:</td>
          <td align="right" style="font-size:15px;color:#111827;font-weight:bold;border-top:1px solid #e5e7eb;">${fmtMoney(quotation.grandTotal, quotation.currencyCode)}</td>
        </tr>
      </table>

      <div style="margin:24px 0;">
        ${button(links.acceptUrl, "Accept Quotation", "#16a34a")}
        ${button(links.downloadUrl, "Download PDF", "#2563eb")}
      </div>

      <p style="font-size:12px;color:#9ca3af;">
        If the buttons above do not work, copy this link into your browser to accept: ${links.acceptUrl}
      </p>
    `;

    return {
      subject: `Quotation ${quotation.code} from Hover Business Services`,
      html: baseLayout(`Quotation ${quotation.code}`, body),
    };
  },

  quotationAccepted(quotation) {
    const body = `
      <p style="font-size:15px;color:#111827;">Quotation <strong>${quotation.code}</strong> has been accepted by ${quotation.customerName || "the customer"}.</p>
      <p style="font-size:14px;color:#374151;">Grand Total: <strong>${fmtMoney(quotation.grandTotal, quotation.currencyCode)}</strong></p>
    `;
    return {
      subject: `Quotation ${quotation.code} accepted`,
      html: baseLayout(`Quotation ${quotation.code} accepted`, body),
    };
  },
};

module.exports = emailTemplates;