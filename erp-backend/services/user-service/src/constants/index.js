'use strict';

const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED'
};

const BULK_JOB_TYPE = { EXPORT: 'EXPORT', IMPORT: 'IMPORT' };

const BULK_JOB_STATUS = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  PARTIAL: 'PARTIAL'
};

const QUEUE_NAMES = { BULK: 'user.bulk' };

const JOB_NAMES = {
  EXPORT_USERS: 'export-users',
  IMPORT_USERS: 'import-users',
  PURGE_EXPORTS: 'purge-expired-exports'
};

/** Column order of the user import/export workbook. */
const IMPORT_COLUMNS = [
  { key: 'employeeCode', header: 'Employee Code', width: 18, required: true },
  { key: 'firstName', header: 'First Name', width: 18, required: true },
  { key: 'lastName', header: 'Last Name', width: 18 },
  { key: 'email', header: 'Email', width: 30, required: true },
  { key: 'mobile', header: 'Mobile', width: 16 },
  { key: 'designation', header: 'Designation', width: 22 },
  { key: 'roleCode', header: 'Role Code', width: 22, required: true },
  { key: 'departmentCode', header: 'Department Code', width: 20 },
  { key: 'reportsToEmail', header: 'Reports To (Email)', width: 30 },
  { key: 'dateOfJoining', header: 'Date Of Joining', width: 16 },
  { key: 'status', header: 'Status', width: 12 }
];

const EXPORT_COLUMNS = [
  ...IMPORT_COLUMNS.filter((c) => c.key !== 'reportsToEmail'),
  { key: 'reportsTo', header: 'Reports To', width: 24 },
  { key: 'lastLoginAt', header: 'Last Login', width: 20 },
  { key: 'createdAt', header: 'Created On', width: 20 }
];

const CACHE = {
  user: (id) => `user:${id}`,
  stats: () => 'user:stats',
  pattern: 'user:*'
};

module.exports = {
  USER_STATUS,
  BULK_JOB_TYPE,
  BULK_JOB_STATUS,
  QUEUE_NAMES,
  JOB_NAMES,
  IMPORT_COLUMNS,
  EXPORT_COLUMNS,
  CACHE
};
