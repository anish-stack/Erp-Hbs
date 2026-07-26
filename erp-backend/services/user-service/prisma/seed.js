'use strict';
const path = require('path');
const { env } = require('@erp/shared');
env.load(path.resolve(__dirname, '..'));
const { PrismaClient } = require('../src/generated/prisma');
const { logger, utils } = require('@erp/shared');
const prisma = new PrismaClient();

const DEPARTMENTS = [
  { code: 'MGMT', name: 'Management' }, { code: 'SALES', name: 'Sales' },
  { code: 'PURCHASE', name: 'Purchase' }, { code: 'WAREHOUSE', name: 'Warehouse' },
  { code: 'FINANCE', name: 'Finance' }, { code: 'QUALITY', name: 'Quality' }
];
const ROLES = [
  { code: 'admin', name: 'Administrator', landingPath: '/dashboard', isSystem: true },
  { code: 'sales_manager', name: 'Sales Manager', landingPath: '/sales/orders' },
  { code: 'purchase_officer', name: 'Purchase Officer', landingPath: '/purchase' },
  { code: 'warehouse_staff', name: 'Warehouse Staff', landingPath: '/inventory/stock' }
];
const USERS = [
  { employeeCode: 'EMP-001', firstName: 'System', lastName: 'Administrator', email: 'admin@erp.local', role: 'admin', dept: 'MGMT' },
  { employeeCode: 'EMP-002', firstName: 'Neha', lastName: 'Kapoor', email: 'neha.sales@erp.local', role: 'sales_manager', dept: 'SALES' },
  { employeeCode: 'EMP-003', firstName: 'Arjun', lastName: 'Verma', email: 'arjun.purchase@erp.local', role: 'purchase_officer', dept: 'PURCHASE' },
  { employeeCode: 'EMP-004', firstName: 'Sana', lastName: 'Iqbal', email: 'sana.wh@erp.local', role: 'warehouse_staff', dept: 'WAREHOUSE' }
];

async function main() {
  logger.info('Seeding user database');
  const deptByCode = {};
  for (const d of DEPARTMENTS) {
    const row = await prisma.department.upsert({ where: { code: d.code }, update: { name: d.name }, create: d });
    deptByCode[d.code] = row.id;
  }
  const roleByCode = {};
  for (const r of ROLES) {
    const row = await prisma.role.upsert({ where: { code: r.code }, update: { name: r.name }, create: { ...r, isActive: true } });
    roleByCode[r.code] = row.id;
  }
  const pwd = await utils.password.hash('Passw0rd@123');
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { firstName: u.firstName, lastName: u.lastName, roleId: roleByCode[u.role], departmentId: deptByCode[u.dept] },
      create: {
        employeeCode: u.employeeCode, firstName: u.firstName, lastName: u.lastName, email: u.email,
        password: pwd, roleId: roleByCode[u.role], departmentId: deptByCode[u.dept], status: 'ACTIVE',
        isEmailVerified: true, dateOfJoining: new Date('2025-01-15')
      }
    });
  }
  logger.info('Seeded %d departments, %d roles, %d users', DEPARTMENTS.length, ROLES.length, USERS.length);
}
main().then(() => prisma.$disconnect()).catch((e) => { logger.error('Seed failed: %s', e); prisma.$disconnect(); process.exit(1); });
