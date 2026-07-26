'use strict';

const path = require('path');
const { env } = require('@erp/shared');

env.load(path.resolve(__dirname, '..'));

const { PrismaClient } = require('../src/generated/prisma');
const { logger, constants } = require('@erp/shared');

const prisma = new PrismaClient();

const UOMS = [
  { code: 'PCS', name: 'Pieces', decimals: 0, isBase: true },
  { code: 'BOX', name: 'Box', decimals: 0, conversion: 100 },
  { code: 'REEL', name: 'Reel', decimals: 0, conversion: 2500 },
  { code: 'TRAY', name: 'Tray', decimals: 0, conversion: 250 },
  { code: 'TUBE', name: 'Tube', decimals: 0, conversion: 50 },
  { code: 'MTR', name: 'Metre', decimals: 2 },
  { code: 'KG', name: 'Kilogram', decimals: 3 },
  { code: 'SET', name: 'Set', decimals: 0 }
];

const CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2, isBase: true, exchangeRate: 1 },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, exchangeRate: 0.012 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, exchangeRate: 0.011 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2, exchangeRate: 0.085 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2, exchangeRate: 0.016 },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2, exchangeRate: 0.093 }
];

const TAX_RATES = [
  { code: 'GST0', name: 'GST 0%', ratePercent: 0, hsnCode: null },
  { code: 'GST5', name: 'GST 5%', ratePercent: 5, hsnCode: '85049090' },
  { code: 'GST12', name: 'GST 12%', ratePercent: 12, hsnCode: '85322100' },
  { code: 'GST18', name: 'GST 18%', ratePercent: 18, hsnCode: '85423900' },
  { code: 'GST28', name: 'GST 28%', ratePercent: 28, hsnCode: '85285900' }
];

/** Electronic component taxonomy used by the trading business. */
const CATEGORIES = [
  { code: 'SEMI', name: 'Semiconductors', children: [
    { code: 'ICS', name: 'Integrated Circuits', children: [
      { code: 'MCU', name: 'Microcontrollers' },
      { code: 'PMIC', name: 'Power Management ICs' },
      { code: 'OPAMP', name: 'Operational Amplifiers' },
      { code: 'LOGIC', name: 'Logic ICs' },
      { code: 'MEMORY', name: 'Memory ICs' }
    ] },
    { code: 'DISCRETE', name: 'Discrete Semiconductors', children: [
      { code: 'DIODE', name: 'Diodes' },
      { code: 'TRANSISTOR', name: 'Transistors' },
      { code: 'MOSFET', name: 'MOSFETs' },
      { code: 'THYRISTOR', name: 'Thyristors and TRIACs' }
    ] }
  ] },
  { code: 'PASSIVE', name: 'Passive Components', children: [
    { code: 'RESISTOR', name: 'Resistors' },
    { code: 'CAPACITOR', name: 'Capacitors' },
    { code: 'INDUCTOR', name: 'Inductors and Chokes' },
    { code: 'CRYSTAL', name: 'Crystals and Oscillators' }
  ] },
  { code: 'ELECTROMECH', name: 'Electromechanical', children: [
    { code: 'CONNECTOR', name: 'Connectors' },
    { code: 'SWITCH', name: 'Switches' },
    { code: 'RELAY', name: 'Relays' },
    { code: 'FUSE', name: 'Fuses and Protection' }
  ] },
  { code: 'OPTO', name: 'Optoelectronics', children: [
    { code: 'LED', name: 'LEDs' },
    { code: 'DISPLAY', name: 'Displays' },
    { code: 'SENSOR_OPT', name: 'Optical Sensors' }
  ] },
  { code: 'MODULE', name: 'Modules and Boards', children: [
    { code: 'RFMOD', name: 'RF and Wireless Modules' },
    { code: 'POWERMOD', name: 'Power Modules' },
    { code: 'DEVBOARD', name: 'Development Boards' }
  ] },
  { code: 'CABLE', name: 'Cables and Wires' },
  { code: 'TOOLS', name: 'Tools and Consumables' }
];

const SEQUENCES = [
  { key: 'RFQ', name: 'Request For Quotation', prefix: 'RFQ', padding: 4 },
  { key: 'PURCHASE_ORDER', name: 'Purchase Order', prefix: 'PO', padding: 4 },
  { key: 'GRN', name: 'Goods Receipt Note', prefix: 'GRN', padding: 4 },
  { key: 'INSPECTION', name: 'Quality Inspection', prefix: 'QC', padding: 4 },
  { key: 'QUOTATION', name: 'Sales Quotation', prefix: 'QT', padding: 4 },
  { key: 'SALES_ORDER', name: 'Sales Order', prefix: 'SO', padding: 4 },
  { key: 'SHIPMENT', name: 'Shipment', prefix: 'SHP', padding: 4 },
  { key: 'INVOICE', name: 'Tax Invoice', prefix: 'INV', padding: 5 },
  { key: 'CREDIT_NOTE', name: 'Credit Note', prefix: 'CN', padding: 4 },
  { key: 'PAYMENT', name: 'Payment Voucher', prefix: 'PAY', padding: 5 },
  { key: 'STOCK_TRANSFER', name: 'Stock Transfer', prefix: 'STN', padding: 4 },
  { key: 'SUPPLIER', name: 'Supplier Code', prefix: 'SUP', padding: 4, includeYear: false, resetPolicy: 'NEVER' },
  { key: 'CUSTOMER', name: 'Customer Code', prefix: 'CUS', padding: 4, includeYear: false, resetPolicy: 'NEVER' }
];

const SETTINGS = [
  { key: 'company.name', groupName: 'company', label: 'Company Name', value: 'Electronic Components Trading Pvt Ltd', dataType: 'STRING', isPublic: true },
  { key: 'company.gstin', groupName: 'company', label: 'GSTIN', value: '', dataType: 'STRING' },
  { key: 'company.state', groupName: 'company', label: 'Registered State', value: 'Delhi', dataType: 'STRING', description: 'Drives intra vs inter state GST selection' },
  { key: 'company.email', groupName: 'company', label: 'Contact Email', value: '', dataType: 'STRING', isPublic: true },
  { key: 'company.phone', groupName: 'company', label: 'Contact Phone', value: '', dataType: 'STRING', isPublic: true },
  { key: 'company.logoFileId', groupName: 'company', label: 'Company Logo', value: '', dataType: 'STRING', isPublic: true },

  { key: 'finance.baseCurrency', groupName: 'finance', label: 'Base Currency', value: 'INR', dataType: 'STRING', isPublic: true, isEditable: false },
  { key: 'finance.defaultPaymentTermDays', groupName: 'finance', label: 'Default Payment Terms (days)', value: 30, dataType: 'NUMBER' },
  { key: 'finance.creditLimitEnforced', groupName: 'finance', label: 'Enforce Customer Credit Limit', value: true, dataType: 'BOOLEAN' },

  { key: 'purchase.approvalThreshold', groupName: 'purchase', label: 'PO Approval Threshold', value: 100000, dataType: 'NUMBER', description: 'Orders above this value need manager approval' },
  { key: 'purchase.autoCreateGrn', groupName: 'purchase', label: 'Auto Create GRN On Delivery', value: false, dataType: 'BOOLEAN' },

  { key: 'inventory.allowNegativeStock', groupName: 'inventory', label: 'Allow Negative Stock', value: false, dataType: 'BOOLEAN' },
  { key: 'inventory.lowStockAlertEnabled', groupName: 'inventory', label: 'Low Stock Alerts', value: true, dataType: 'BOOLEAN' },
  { key: 'inventory.valuationMethod', groupName: 'inventory', label: 'Valuation Method', value: 'FIFO', dataType: 'STRING' },

  { key: 'quality.mandatoryInspection', groupName: 'quality', label: 'Mandatory Inspection On Receipt', value: true, dataType: 'BOOLEAN' },
  { key: 'quality.sampleSizePercent', groupName: 'quality', label: 'Default Sample Size (%)', value: 10, dataType: 'NUMBER' },

  { key: 'ui.dateFormat', groupName: 'ui', label: 'Date Format', value: 'DD-MM-YYYY', dataType: 'STRING', isPublic: true },
  { key: 'ui.pageSize', groupName: 'ui', label: 'Default Page Size', value: 20, dataType: 'NUMBER', isPublic: true },
  { key: 'ui.theme', groupName: 'ui', label: 'Default Theme', value: 'light', dataType: 'STRING', isPublic: true }
];

async function seedUoms() {
  const base = await prisma.uom.upsert({
    where: { code: 'PCS' },
    update: { name: 'Pieces', isBase: true, decimals: 0, conversion: 1 },
    create: { code: 'PCS', name: 'Pieces', isBase: true, decimals: 0, conversion: 1 }
  });

  for (const uom of UOMS.filter((row) => row.code !== 'PCS')) {
    await prisma.uom.upsert({
      where: { code: uom.code },
      update: { name: uom.name, decimals: uom.decimals, conversion: uom.conversion || 1 },
      create: {
        code: uom.code,
        name: uom.name,
        decimals: uom.decimals,
        conversion: uom.conversion || 1,
        baseUomId: uom.conversion ? base.id : null
      }
    });
  }

  logger.info('Seeded %d units of measure', UOMS.length);
}

async function seedCurrencies() {
  for (const currency of CURRENCIES) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: { exchangeRate: currency.exchangeRate, rateUpdatedAt: new Date() },
      create: { ...currency, rateUpdatedAt: new Date() }
    });
  }
  logger.info('Seeded %d currencies', CURRENCIES.length);
}

async function seedTaxRates() {
  for (const tax of TAX_RATES) {
    await prisma.taxRate.upsert({
      where: { code: tax.code },
      update: { ratePercent: tax.ratePercent, hsnCode: tax.hsnCode },
      create: {
        code: tax.code,
        name: tax.name,
        hsnCode: tax.hsnCode,
        ratePercent: tax.ratePercent,
        cgstPercent: tax.ratePercent / 2,
        sgstPercent: tax.ratePercent / 2,
        igstPercent: tax.ratePercent,
        effectiveFrom: new Date('2024-01-01')
      }
    });
  }
  logger.info('Seeded %d tax rates', TAX_RATES.length);
}

async function seedCategories(nodes, parent = null, level = 0) {
  let count = 0;

  for (const [index, node] of nodes.entries()) {
    const path = parent ? `${parent.path}/${node.code}` : node.code;

    const category = await prisma.category.upsert({
      where: { code: node.code },
      update: { name: node.name, parentId: parent ? parent.id : null, path, level, sortOrder: index * 10 },
      create: {
        code: node.code,
        name: node.name,
        parentId: parent ? parent.id : null,
        path,
        level,
        sortOrder: index * 10
      }
    });

    count += 1;
    if (node.children) count += await seedCategories(node.children, category, level + 1);
  }

  return count;
}

async function seedSequences() {
  const year = String(new Date().getFullYear());

  for (const sequence of SEQUENCES) {
    await prisma.numberSequence.upsert({
      where: { key: sequence.key },
      update: { name: sequence.name, prefix: sequence.prefix, padding: sequence.padding },
      create: {
        key: sequence.key,
        name: sequence.name,
        prefix: sequence.prefix,
        padding: sequence.padding,
        includeYear: sequence.includeYear !== false,
        resetPolicy: sequence.resetPolicy || 'YEARLY',
        periodKey: sequence.resetPolicy === 'NEVER' ? 'ALL' : year
      }
    });
  }
  logger.info('Seeded %d number sequences', SEQUENCES.length);
}

async function seedSettings() {
  for (const setting of SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { label: setting.label, groupName: setting.groupName, dataType: setting.dataType },
      create: setting
    });
  }
  logger.info('Seeded %d settings', SETTINGS.length);
}

async function seedManufacturers() {
  const { MANUFACTURERS } = constants.DEMO;
  for (const m of MANUFACTURERS) {
    await prisma.manufacturer.upsert({
      where: { code: m.code },
      update: { name: m.name },
      create: { id: m.id, code: m.code, name: m.name }
    });
  }
  logger.info('Seeded %d manufacturers', MANUFACTURERS.length);
}

function normalize(pn) {
  return String(pn).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function seedParts() {
  const { PARTS } = constants.DEMO;
  // resolve the real local uom/category ids by their well-known codes
  const uomByCode = {};
  for (const u of await prisma.uom.findMany()) uomByCode[u.code] = u.id;
  const catByCode = {};
  for (const c of await prisma.category.findMany()) catByCode[c.code] = c.id;
  const mfrById = {};
  for (const m of await prisma.manufacturer.findMany()) mfrById[m.id] = m.id;

  // fixture parts carry fixture uom/category ids; map them to codes here
  const uomCodeForFixture = { '33333333-3333-4333-8333-000000000001': 'PCS', '33333333-3333-4333-8333-000000000002': 'REEL', '33333333-3333-4333-8333-000000000003': 'MTR' };
  const catCodeForFixture = { '22222222-2222-4222-8222-000000000001': 'SEMI', '22222222-2222-4222-8222-000000000002': 'PASSIVE', '22222222-2222-4222-8222-000000000003': 'CONN', '22222222-2222-4222-8222-000000000004': 'MODULE' };

  let count = 0;
  for (const p of PARTS) {
    const uomId = uomByCode[uomCodeForFixture[p.uomId]] || uomByCode.PCS;
    const categoryId = catByCode[catCodeForFixture[p.categoryId]] || Object.values(catByCode)[0];
    const manufacturerId = mfrById[p.manufacturerId];
    if (!uomId || !categoryId || !manufacturerId) { logger.warn('Skipping part %s (missing ref)', p.partNumber); continue; }
    await prisma.part.upsert({
      where: { id: p.id },
      update: { description: p.description },
      create: {
        id: p.id,
        partNumber: p.partNumber,
        normalizedNumber: normalize(p.partNumber),
        manufacturerId,
        categoryId,
        uomId,
        description: p.description
      }
    });
    count++;
  }
  logger.info('Seeded %d parts', count);
}

async function main() {
  logger.info('Seeding master data');
  await seedUoms();
  await seedCurrencies();
  await seedTaxRates();
  const categories = await seedCategories(CATEGORIES);
  logger.info('Seeded %d categories', categories);
  await seedSequences();
  await seedSettings();
  await seedManufacturers();
  await seedParts();
  logger.info('Master data seed complete');
}

main()
  .catch((err) => {
    logger.error('Seed failed: %s', err.stack || err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
