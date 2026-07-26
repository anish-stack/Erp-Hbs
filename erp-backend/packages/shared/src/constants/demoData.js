'use strict';

/*
  Shared demo fixtures. Because every service owns a separate database, seeds
  can't share auto-generated IDs. Instead we pin fixed UUIDs here so that a
  part seeded by master-service is the same partId a sales order (sales-service)
  or stock row (inventory-service) references. Keep these stable.

  All ids are valid v4 UUIDs (safe for Char(36) / uuid columns).
*/

const IDS = {
  // manufacturers
  mfrTexas: '11111111-1111-4111-8111-000000000001',
  mfrStm: '11111111-1111-4111-8111-000000000002',
  mfrMurata: '11111111-1111-4111-8111-000000000003',

  // categories
  catSemi: '22222222-2222-4222-8222-000000000001',
  catPassive: '22222222-2222-4222-8222-000000000002',
  catConnector: '22222222-2222-4222-8222-000000000003',
  catModule: '22222222-2222-4222-8222-000000000004',

  // uoms
  uomPcs: '33333333-3333-4333-8333-000000000001',
  uomReel: '33333333-3333-4333-8333-000000000002',
  uomMtr: '33333333-3333-4333-8333-000000000003',

  // parts
  partMcu: '44444444-4444-4444-8444-000000000001',
  partOpAmp: '44444444-4444-4444-8444-000000000002',
  partCap: '44444444-4444-4444-8444-000000000003',
  partRes: '44444444-4444-4444-8444-000000000004',
  partConn: '44444444-4444-4444-8444-000000000005',

  // suppliers
  supAlpha: '55555555-5555-4555-8555-000000000001',
  supBeta: '55555555-5555-4555-8555-000000000002',
  supGamma: '55555555-5555-4555-8555-000000000003',

  // customers
  custNova: '66666666-6666-4666-8666-000000000001',
  custOrbit: '66666666-6666-4666-8666-000000000002',
  custPixel: '66666666-6666-4666-8666-000000000003',

  // warehouses
  whMain: '77777777-7777-4777-8777-000000000001',
  whSecondary: '77777777-7777-4777-8777-000000000002',

  // a known admin user id (matches auth seed admin where possible; used as actor)
  adminUser: '99999999-9999-4999-8999-000000000001'
};

const MANUFACTURERS = [
  { id: IDS.mfrTexas, code: 'TI', name: 'Texas Instruments' },
  { id: IDS.mfrStm, code: 'STM', name: 'STMicroelectronics' },
  { id: IDS.mfrMurata, code: 'MUR', name: 'Murata' }
];

const CATEGORIES = [
  { id: IDS.catSemi, code: 'SEMI', name: 'Semiconductors', path: 'Semiconductors' },
  { id: IDS.catPassive, code: 'PASSIVE', name: 'Passives', path: 'Passives' },
  { id: IDS.catConnector, code: 'CONN', name: 'Connectors', path: 'Connectors' },
  { id: IDS.catModule, code: 'MODULE', name: 'Modules', path: 'Modules' }
];

const UOMS = [
  { id: IDS.uomPcs, code: 'PCS', name: 'Pieces' },
  { id: IDS.uomReel, code: 'REEL', name: 'Reel' },
  { id: IDS.uomMtr, code: 'MTR', name: 'Meter' }
];

const PARTS = [
  { id: IDS.partMcu, partNumber: 'MSP430F5529', manufacturerId: IDS.mfrTexas, categoryId: IDS.catSemi, uomId: IDS.uomPcs, description: '16-bit MCU, 128KB Flash, USB', unitPrice: 480, hsn: '85423900' },
  { id: IDS.partOpAmp, partNumber: 'TL072CP', manufacturerId: IDS.mfrTexas, categoryId: IDS.catSemi, uomId: IDS.uomPcs, description: 'Dual low-noise JFET op-amp', unitPrice: 32, hsn: '85423900' },
  { id: IDS.partCap, partNumber: 'GRM188R71H104KA93D', manufacturerId: IDS.mfrMurata, categoryId: IDS.catPassive, uomId: IDS.uomReel, description: '0.1uF 50V X7R 0603 MLCC', unitPrice: 1.4, hsn: '85322400' },
  { id: IDS.partRes, partNumber: 'RC0603FR-0710KL', manufacturerId: IDS.mfrMurata, categoryId: IDS.catPassive, uomId: IDS.uomReel, description: '10k 1% 0603 thick-film resistor', unitPrice: 0.6, hsn: '85331000' },
  { id: IDS.partConn, partNumber: 'PJ-102AH', manufacturerId: IDS.mfrStm, categoryId: IDS.catConnector, uomId: IDS.uomPcs, description: '2.1mm DC barrel jack, PCB mount', unitPrice: 9.5, hsn: '85366990' }
];

const SUPPLIERS = [
  { id: IDS.supAlpha, code: 'SUP-0001', legalName: 'Alpha Components Pvt Ltd', city: 'Delhi', state: 'Delhi', email: 'sales@alphacomp.in', gstin: '07AAACA1111A1Z5' },
  { id: IDS.supBeta, code: 'SUP-0002', legalName: 'Beta Semikart LLP', city: 'Bengaluru', state: 'Karnataka', email: 'contact@betasemikart.in', gstin: '29AAACB2222B1Z6' },
  { id: IDS.supGamma, code: 'SUP-0003', legalName: 'Gamma Electro Traders', city: 'Mumbai', state: 'Maharashtra', email: 'info@gammaelectro.in', gstin: '27AAACG3333C1Z7' }
];

const CUSTOMERS = [
  { id: IDS.custNova, code: 'CUST-0001', legalName: 'Nova Robotics Pvt Ltd', city: 'Pune', state: 'Maharashtra', email: 'buy@novarobotics.in', gstin: '27AAACN4444D1Z8', creditLimit: 500000 },
  { id: IDS.custOrbit, code: 'CUST-0002', legalName: 'Orbit Instruments', city: 'Chennai', state: 'Tamil Nadu', email: 'purchase@orbitinst.in', gstin: '33AAACO5555E1Z9', creditLimit: 300000 },
  { id: IDS.custPixel, code: 'CUST-0003', legalName: 'Pixel Devices', city: 'Delhi', state: 'Delhi', email: 'orders@pixeldev.in', gstin: '07AAACP6666F1Z0', creditLimit: 200000 }
];

const WAREHOUSES = [
  { id: IDS.whMain, code: 'WH-MAIN', name: 'Main Warehouse — Delhi', city: 'Delhi', isDefault: true },
  { id: IDS.whSecondary, code: 'WH-BLR', name: 'Bengaluru Hub', city: 'Bengaluru', isDefault: false }
];

// seller identity for GST place-of-supply logic (matches Delhi state code 07)
const SELLER = { stateCode: '07', gstin: '07AAACS0000S1Z1', legalName: 'Nexus Components Trading Pvt Ltd' };

module.exports = { IDS, MANUFACTURERS, CATEGORIES, UOMS, PARTS, SUPPLIERS, CUSTOMERS, WAREHOUSES, SELLER };
