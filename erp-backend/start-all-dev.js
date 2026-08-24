'use strict';

const { spawn } = require('child_process');
const path = require('path');

const services = [
  'api-gateway',
  'auth-service',
  'role-service',
  'user-service',
  'audit-service',
  'file-service',
  'master-service',
  'supplier-service',
  'crm-service',
  'rfq-service',
  'purchase-service',
  'inventory-service',
  'warehouse-service',
  'quality-service',
  'sales-service',
  'finance-service',
  'shipment-service',
  'notification-service',
  'report-service',
  'dashboard-service'
];

const root = __dirname;

for (const service of services) {
  const servicePath = path.join(root, 'services', service);

  console.log(`Starting ${service}...`);

  spawn(
    'cmd.exe',
    ['/k', `cd /d "${servicePath}" && npm run dev`],
    {
      cwd: servicePath,
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    }
  );
}

console.log(`\nStarted ${services.length} services.`);