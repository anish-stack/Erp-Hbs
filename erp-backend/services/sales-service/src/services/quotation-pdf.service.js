'use strict';
const ejs = require('ejs');
const path = require('path');
const puppeteer = require('puppeteer');
const { toWords } = require('../utils/number-to-words');

const TEMPLATE_PATH = path.join(__dirname, '../templates/quotation.ejs');

function money(v) {
  return Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildViewModel(q) {
  return {
    company: {
      name: 'THE CHIPS VALLY',
      tagline: 'Electronic Components & Trading',
      addressLine1: 'Plot 42, Electronic City Phase-1',
      addressLine2: 'New Delhi - 110020, India',
      phone: '+91 (011) 2988-4500',
      email: 'sales@thechipsvally.com',
      website: 'www.thechipsvally.com',
      gstin: '07AABCT5512K1ZX'
    },
    code: q.code,
    quoteDate: new Date(q.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
    validUntil: new Date(q.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
    customerName: q.customerName,
    customerGstin: q.customerGstin || '-',
    customerAddress: q.customerAddress || '-',
    contactPerson: q.contactPerson || '-',
    salesExecutive: q.salesExecutive || '-',
    paymentTerms: q.terms || '100% Advance',
    lines: (q.lines || []).map((l, i) => ({
      sno: i + 1,
      partCode: l.partCode,
      description: l.description,
      manufacturer: l.manufacturer,
      qty: l.quantity,
      unit: l.unit || 'PCS',
      unitPrice: money(l.unitPrice),
      discountPct: l.discountPct,
      taxRatePct: l.taxRatePct,
      lineTotal: money(l.lineTotal)
    })),
    subtotal: money(q.subtotal),
    discountTotal: money(q.discountTotal),
    taxableAmount: money(Number(q.subtotal || 0) - Number(q.discountTotal || 0)),
    taxTotal: money(q.taxTotal),
    taxLabel: '18% Integrated',
    grandTotal: money(q.grandTotal),
    grandTotalWords: toWords ? toWords(q.grandTotal) : '',
    dispatchTerms: [
      '<strong>Payment Terms:</strong> 100% advance along with confirmed purchase order.',
      '<strong>Delivery Schedule:</strong> 5–7 working days from receipt of payment.',
      '<strong>Quotation Validity:</strong> Valid for 15 days from the date of issuance.',
      '<strong>Stock Availability:</strong> Prices and delivery are subject to prior stock availability.'
    ],
    termsConditions: [
      'All electronic components supplied are 100% original, brand new, and sourced directly from authorized manufacturers or global franchised distributors.',
      'Warranty is limited to manufacturer standard defect replacement within 30 days of delivery. No liability accepted for improper soldering or ESD damage.',
      'Order once placed against this quotation cannot be cancelled or modified without written confirmation and applicable restocking charges.',
      'Disputes, if any, are subject exclusively to New Delhi jurisdiction courts. Goods dispatched remain property of The Chips Vally until paid in full.'
    ]
  };
}

class QuotationPdfService {
  /** Renders EJS -> HTML -> PDF buffer. No storage, no persistence. */
  static async renderBuffer(q) {
    const html = await ejs.renderFile(TEMPLATE_PATH, buildViewModel(q));

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      return await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' }
      });
    } finally {
      await browser.close();
    }
  }
}
module.exports = QuotationPdfService;