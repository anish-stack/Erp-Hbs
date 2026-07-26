'use strict';

const { utils, logger } = require('@erp/shared');
const { prisma } = require('../config/prisma');
const UserRepository = require('../repositories/user.repository');
const ExcelService = require('./excel.service');
const { USER_STATUS } = require('../constants');
const config = require('../config');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateRow(row, context) {
  const errors = [];

  for (const field of ['employeeCode', 'firstName', 'email', 'roleCode']) {
    if (!row[field]) errors.push(`${field} is required`);
  }

  if (row.email && !EMAIL_PATTERN.test(row.email)) errors.push('email is invalid');

  if (row.mobile && !/^[0-9+\-\s]{8,20}$/.test(row.mobile)) errors.push('mobile is invalid');

  if (row.roleCode && !context.roles.has(row.roleCode.toUpperCase())) {
    errors.push(`unknown roleCode "${row.roleCode}"`);
  }

  if (row.departmentCode && !context.departments.has(row.departmentCode.toUpperCase())) {
    errors.push(`unknown departmentCode "${row.departmentCode}"`);
  }

  if (row.status && !Object.values(USER_STATUS).includes(row.status.toUpperCase())) {
    errors.push(`status must be one of ${Object.values(USER_STATUS).join(', ')}`);
  }

  if (row.dateOfJoining && Number.isNaN(new Date(row.dateOfJoining).valueOf())) {
    errors.push('dateOfJoining must be a valid date (YYYY-MM-DD)');
  }

  const email = (row.email || '').toLowerCase();
  if (email && context.seenEmails.has(email)) errors.push('duplicate email inside the file');
  if (email) context.seenEmails.add(email);

  const code = (row.employeeCode || '').toUpperCase();
  if (code && context.seenCodes.has(code)) errors.push('duplicate employeeCode inside the file');
  if (code) context.seenCodes.add(code);

  if (email && context.existingEmails.has(email)) errors.push('email already exists in the system');
  if (code && context.existingCodes.has(code)) errors.push('employeeCode already exists in the system');

  return errors;
}

class ImportService {
  /**
   * Validates and inserts users from an uploaded workbook.
   * Valid rows are committed; invalid rows are returned as a per-row error report.
   */
  static async run({ filePath, defaultPassword, actorId, onProgress }) {
    const rows = await ExcelService.readImportFile(filePath);

    if (!rows.length) {
      return { totalRows: 0, successRows: 0, failedRows: 0, errors: [], createdIds: [] };
    }

    if (rows.length > config.bulk.maxImportRows) {
      throw new Error(
        `File contains ${rows.length} rows which exceeds the limit of ${config.bulk.maxImportRows}`
      );
    }

    const [roles, departments] = await Promise.all([
      prisma.role.findMany({ where: { deletedAt: null, isActive: true }, select: { id: true, code: true } }),
      prisma.department.findMany({ where: { deletedAt: null }, select: { id: true, code: true } })
    ]);

    const emails = rows.map((row) => (row.email || '').toLowerCase()).filter(Boolean);
    const codes = rows.map((row) => (row.employeeCode || '').toUpperCase()).filter(Boolean);

    const existing = await prisma.user.findMany({
      where: { OR: [{ email: { in: emails } }, { employeeCode: { in: codes } }] },
      select: { email: true, employeeCode: true }
    });

    const context = {
      roles: new Map(roles.map((role) => [role.code, role.id])),
      departments: new Map(departments.map((department) => [department.code, department.id])),
      existingEmails: new Set(existing.map((user) => user.email.toLowerCase())),
      existingCodes: new Set(existing.map((user) => user.employeeCode.toUpperCase())),
      seenEmails: new Set(),
      seenCodes: new Set()
    };

    const managerEmails = rows.map((row) => (row.reportsToEmail || '').toLowerCase()).filter(Boolean);
    const managers = managerEmails.length
      ? await prisma.user.findMany({
          where: { email: { in: managerEmails }, deletedAt: null },
          select: { id: true, email: true }
        })
      : [];
    const managerMap = new Map(managers.map((manager) => [manager.email.toLowerCase(), manager.id]));

    const hashedDefault = await utils.password.hash(defaultPassword);

    const errors = [];
    const valid = [];

    for (const row of rows) {
      const rowErrors = validateRow(row, context);

      if (row.reportsToEmail && !managerMap.has(row.reportsToEmail.toLowerCase())) {
        rowErrors.push(`reportsToEmail "${row.reportsToEmail}" not found`);
      }

      if (rowErrors.length) {
        errors.push({ row: row.__row, employeeCode: row.employeeCode, email: row.email, errors: rowErrors });
        continue;
      }

      valid.push({
        employeeCode: row.employeeCode.toUpperCase(),
        firstName: row.firstName,
        lastName: row.lastName || null,
        email: row.email.toLowerCase(),
        mobile: row.mobile || null,
        designation: row.designation || null,
        password: hashedDefault,
        roleId: context.roles.get(row.roleCode.toUpperCase()),
        departmentId: row.departmentCode
          ? context.departments.get(row.departmentCode.toUpperCase())
          : null,
        reportsToId: row.reportsToEmail ? managerMap.get(row.reportsToEmail.toLowerCase()) : null,
        dateOfJoining: row.dateOfJoining ? new Date(row.dateOfJoining) : null,
        status: row.status ? row.status.toUpperCase() : USER_STATUS.ACTIVE,
        mustChangePassword: true,
        createdBy: actorId,
        updatedBy: actorId
      });
    }

    let inserted = 0;
    const chunkSize = 200;

    for (let index = 0; index < valid.length; index += chunkSize) {
      const chunk = valid.slice(index, index + chunkSize);
      const result = await UserRepository.createMany(chunk);
      inserted += result.count;
      if (onProgress) await onProgress(Math.min(index + chunkSize, valid.length), rows.length);
    }

    logger.info('User import finished: %d inserted, %d failed', inserted, errors.length);

    return {
      totalRows: rows.length,
      successRows: inserted,
      failedRows: errors.length,
      errors: errors.slice(0, 500)
    };
  }

  static validateRow = validateRow;
}

module.exports = ImportService;
