'use strict';

const path = require('path');
const { env } = require('@erp/shared');

env.load(path.resolve(__dirname, '..'));

const { PrismaClient } = require('../src/generated/prisma');
const { utils, constants, logger } = require('@erp/shared');

const prisma = new PrismaClient();
const { ROLES } = constants.ROLES;
const { MODULES, ACTIONS, SUPER_ADMIN_PERMISSION } = constants.PERMISSION_META;

const DEPARTMENTS = [
  { code: 'MGMT', name: 'Management' },
  { code: 'SALES', name: 'Sales' },
  { code: 'PURCHASE', name: 'Purchase' },
  { code: 'WAREHOUSE', name: 'Warehouse' },
  { code: 'QUALITY', name: 'Quality' },
  { code: 'FINANCE', name: 'Finance' },
  { code: 'LOGISTICS', name: 'Logistics' },
  { code: 'IT', name: 'Information Technology' }
];

const all = (module) => ACTIONS.map((action) => `${module}.${action}`);
const view = (...modules) => modules.map((m) => `${m}.view`);
const crud = (...modules) =>
  modules.flatMap((m) => [`${m}.view`, `${m}.create`, `${m}.update`, `${m}.delete`]);
const readWrite = (...modules) => modules.flatMap((m) => [`${m}.view`, `${m}.create`, `${m}.update`]);

const ROLE_DEFINITIONS = [
  {
    code: ROLES.SUPER_ADMIN,
    name: 'Super Admin',
    landingPath: '/dashboard/admin',
    permissions: [SUPER_ADMIN_PERMISSION]
  },
  {
    code: ROLES.COUNTRY_HEAD,
    name: 'Country Head',
    landingPath: '/dashboard/executive',
    permissions: [
      ...view('dashboard', 'user', 'role', 'department', 'audit'),
      ...all('report'),
      ...readWrite('supplier', 'customer', 'lead', 'rfq', 'purchase', 'sales', 'finance'),
      'purchase.approve',
      'sales.approve',
      'rfq.approve',
      'finance.approve',
      ...view('inventory', 'warehouse', 'quality', 'shipment', 'invoice', 'payment')
    ]
  },
  {
    code: ROLES.MANAGEMENT,
    name: 'Management',
    landingPath: '/dashboard/executive',
    permissions: [
      ...view(
        'dashboard', 'report', 'supplier', 'customer', 'lead', 'rfq', 'purchase', 'grn',
        'inventory', 'warehouse', 'quality', 'sales', 'shipment', 'finance', 'invoice',
        'payment', 'audit'
      ),
      'report.export'
    ]
  },
  {
    code: ROLES.SALES_MANAGER,
    name: 'Sales Manager',
    landingPath: '/dashboard/sales',
    permissions: [
      'dashboard.view',
      ...crud('lead', 'customer', 'rfq', 'sales'),
      'sales.approve',
      'rfq.approve',
      'sales.export',
      ...view('inventory', 'part', 'manufacturer', 'category', 'shipment', 'invoice', 'report')
    ]
  },
  {
    code: ROLES.SALES_EXECUTIVE,
    name: 'Sales Executive',
    landingPath: '/dashboard/sales',
    permissions: [
      'dashboard.view',
      ...readWrite('lead', 'customer', 'rfq', 'sales'),
      ...view('inventory', 'part', 'manufacturer', 'category', 'shipment', 'invoice')
    ]
  },
  {
    code: ROLES.PURCHASE_MANAGER,
    name: 'Purchase Manager',
    landingPath: '/dashboard/purchase',
    permissions: [
      'dashboard.view',
      ...crud('supplier', 'purchase', 'grn', 'rfq'),
      'purchase.approve',
      'supplier.approve',
      'purchase.export',
      ...view('inventory', 'part', 'manufacturer', 'category', 'quality', 'report')
    ]
  },
  {
    code: ROLES.PURCHASE_EXECUTIVE,
    name: 'Purchase Executive',
    landingPath: '/dashboard/purchase',
    permissions: [
      'dashboard.view',
      ...readWrite('supplier', 'purchase', 'grn', 'rfq'),
      ...view('inventory', 'part', 'manufacturer', 'category')
    ]
  },
  {
    code: ROLES.WAREHOUSE_MANAGER,
    name: 'Warehouse Manager',
    landingPath: '/dashboard/warehouse',
    permissions: [
      'dashboard.view',
      ...crud('inventory', 'warehouse', 'grn'),
      'inventory.approve',
      'inventory.export',
      ...view('purchase', 'sales', 'shipment', 'part', 'quality', 'report')
    ]
  },
  {
    code: ROLES.WAREHOUSE_STAFF,
    name: 'Warehouse Staff',
    landingPath: '/dashboard/warehouse',
    permissions: [
      'dashboard.view',
      ...readWrite('inventory', 'grn'),
      ...view('warehouse', 'purchase', 'sales', 'part', 'shipment')
    ]
  },
  {
    code: ROLES.QUALITY_INSPECTOR,
    name: 'Quality Inspector',
    landingPath: '/dashboard/quality',
    permissions: [
      'dashboard.view',
      ...crud('quality'),
      'quality.approve',
      ...view('grn', 'purchase', 'inventory', 'part', 'supplier')
    ]
  },
  {
    code: ROLES.FINANCE_MANAGER,
    name: 'Finance Manager',
    landingPath: '/dashboard/finance',
    permissions: [
      'dashboard.view',
      ...crud('finance', 'invoice', 'payment'),
      'finance.approve',
      'invoice.approve',
      'finance.export',
      ...view('purchase', 'sales', 'supplier', 'customer', 'report', 'audit')
    ]
  },
  {
    code: ROLES.FINANCE_EXECUTIVE,
    name: 'Finance Executive',
    landingPath: '/dashboard/finance',
    permissions: [
      'dashboard.view',
      ...readWrite('finance', 'invoice', 'payment'),
      ...view('purchase', 'sales', 'supplier', 'customer')
    ]
  },
  {
    code: ROLES.LOGISTICS_MANAGER,
    name: 'Logistics Manager',
    landingPath: '/dashboard/logistics',
    permissions: [
      'dashboard.view',
      ...crud('shipment'),
      'shipment.approve',
      'shipment.export',
      ...view('sales', 'purchase', 'warehouse', 'inventory', 'customer', 'supplier')
    ]
  },
  {
    code: ROLES.CRM_EXECUTIVE,
    name: 'CRM Executive',
    landingPath: '/dashboard/crm',
    permissions: [
      'dashboard.view',
      ...crud('lead', 'customer'),
      ...view('sales', 'rfq', 'invoice', 'shipment')
    ]
  },
  {
    code: ROLES.CUSTOMER_PORTAL,
    name: 'Customer Portal',
    landingPath: '/portal/customer',
    permissions: [...view('rfq', 'sales', 'shipment', 'invoice'), 'rfq.create', 'file.view']
  },
  {
    code: ROLES.SUPPLIER_PORTAL,
    name: 'Supplier Portal',
    landingPath: '/portal/supplier',
    permissions: [...view('purchase', 'rfq', 'invoice', 'quality'), 'rfq.update', 'file.view']
  }
];

async function seedPermissions() {
  const codes = [
    { code: SUPER_ADMIN_PERMISSION, module: '*', action: '*', description: 'Full system access' },
    ...MODULES.flatMap((module) =>
      ACTIONS.map((action) => ({
        code: `${module}.${action}`,
        module,
        action,
        description: `${action} ${module}`
      }))
    )
  ];

  for (const permission of codes) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { module: permission.module, action: permission.action },
      create: permission
    });
  }

  logger.info('Seeded %d permissions', codes.length);
  return prisma.permission.findMany({ select: { id: true, code: true } });
}

async function seedDepartments() {
  for (const department of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { code: department.code },
      update: { name: department.name },
      create: department
    });
  }
  logger.info('Seeded %d departments', DEPARTMENTS.length);
}

async function seedRoles(permissionRows) {
  const byCode = new Map(permissionRows.map((p) => [p.code, p.id]));

  for (const definition of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { code: definition.code },
      update: { name: definition.name, landingPath: definition.landingPath, isSystem: true },
      create: {
        code: definition.code,
        name: definition.name,
        landingPath: definition.landingPath,
        isSystem: true,
        description: `${definition.name} system role`
      }
    });

    const permissionIds = [...new Set(definition.permissions)]
      .map((code) => byCode.get(code))
      .filter(Boolean);

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true
    });

    logger.info('Role %s -> %d permissions', definition.code, permissionIds.length);
  }
}

async function seedSuperAdmin() {
  const email = env.str('SEED_SUPER_ADMIN_EMAIL', 'admin@erp.local').toLowerCase();
  const password = env.str('SEED_SUPER_ADMIN_PASSWORD', 'Admin@12345');
  const name = env.str('SEED_SUPER_ADMIN_NAME', 'System Administrator');

  const role = await prisma.role.findUnique({ where: { code: ROLES.SUPER_ADMIN } });
  const department = await prisma.department.findUnique({ where: { code: 'IT' } });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    logger.info('Super admin already exists: %s', email);
    return;
  }

  await prisma.user.create({
    data: {
      employeeCode: 'EMP0001',
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' ') || null,
      email,
      password: await utils.password.hash(password),
      designation: 'System Administrator',
      roleId: role.id,
      departmentId: department ? department.id : null,
      status: 'ACTIVE',
      isEmailVerified: true,
      mustChangePassword: true
    }
  });

  logger.info('Super admin created: %s (change the password after first login)', email);
}

async function main() {
  logger.info('Seeding auth database');
  const permissions = await seedPermissions();
  await seedDepartments();
  await seedRoles(permissions);
  await seedSuperAdmin();
  logger.info('Seed complete');
}

main()
  .catch((err) => {
    logger.error('Seed failed: %s', err.stack || err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
