'use strict';

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { logger, utils } = require('@erp/shared');
const config = require('../config');
const { EXPORT_COLUMNS, IMPORT_COLUMNS } = require('../constants');
const UserRepository = require('../repositories/user.repository');
const { fullName } = require('../utils/userShape');

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF13246B' } };

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function styleHeader(row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  row.fill = HEADER_FILL;
  row.alignment = { vertical: 'middle', horizontal: 'left' };
  row.height = 22;
}

function formatDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? '' : date.toISOString().slice(0, 10);
}

class ExcelService {
  /** Streams users into an .xlsx file without loading the whole table into memory. */
  static async exportUsers({ filters = {}, filePath, onProgress }) {
    ensureDir(path.dirname(filePath));

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: filePath, useStyles: true });
    const sheet = workbook.addWorksheet('Users', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    sheet.columns = EXPORT_COLUMNS.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width
    }));
    styleHeader(sheet.getRow(1));

    const where = utils.queryBuilder.buildWhere(filters, {
      searchFields: ['firstName', 'lastName', 'email', 'employeeCode'],
      filterFields: { status: 'string', roleId: 'string', departmentId: 'string' }
    });

    let written = 0;
    await UserRepository.streamAll(where, { createdAt: 'desc' }, async (batch) => {
      for (const user of batch) {
        sheet
          .addRow({
            employeeCode: user.employeeCode,
            firstName: user.firstName,
            lastName: user.lastName || '',
            email: user.email,
            mobile: user.mobile || '',
            designation: user.designation || '',
            roleCode: user.role ? user.role.code : '',
            departmentCode: user.department ? user.department.code : '',
            dateOfJoining: formatDate(user.dateOfJoining),
            status: user.status,
            reportsTo: user.reportsTo ? fullName(user.reportsTo) : '',
            lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : '',
            createdAt: new Date(user.createdAt).toISOString()
          })
          .commit();
      }
      written += batch.length;
      if (onProgress) await onProgress(written);
    });

    sheet.commit();
    await workbook.commit();

    logger.info('Exported %d users to %s', written, filePath);
    return { rows: written, filePath };
  }

  /** Import template with a dropdown-friendly reference sheet. */
  static async buildImportTemplate({ roles = [], departments = [], filePath }) {
    ensureDir(path.dirname(filePath));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Users');

    sheet.columns = IMPORT_COLUMNS.map((column) => ({
      header: column.required ? `${column.header} *` : column.header,
      key: column.key,
      width: column.width
    }));
    styleHeader(sheet.getRow(1));

    sheet.addRow({
      employeeCode: 'EMP1001',
      firstName: 'Amit',
      lastName: 'Sharma',
      email: 'amit.sharma@example.com',
      mobile: '9810012345',
      designation: 'Purchase Executive',
      roleCode: 'PURCHASE_EXECUTIVE',
      departmentCode: 'PURCHASE',
      reportsToEmail: 'manager@example.com',
      dateOfJoining: '2026-01-15',
      status: 'ACTIVE'
    });

    const reference = workbook.addWorksheet('Reference');
    reference.columns = [
      { header: 'Role Code', key: 'roleCode', width: 28 },
      { header: 'Role Name', key: 'roleName', width: 28 },
      { header: 'Department Code', key: 'deptCode', width: 24 },
      { header: 'Department Name', key: 'deptName', width: 28 }
    ];
    styleHeader(reference.getRow(1));

    const maxRows = Math.max(roles.length, departments.length);
    for (let index = 0; index < maxRows; index += 1) {
      reference.addRow({
        roleCode: roles[index] ? roles[index].code : '',
        roleName: roles[index] ? roles[index].name : '',
        deptCode: departments[index] ? departments[index].code : '',
        deptName: departments[index] ? departments[index].name : ''
      });
    }

    await workbook.xlsx.writeFile(filePath);
    return { filePath };
  }

  /** Reads an uploaded workbook into plain row objects. */
  static async readImportFile(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheet = workbook.getWorksheet('Users') || workbook.worksheets[0];
    if (!sheet) throw new Error('Workbook contains no worksheet');

    const headerRow = sheet.getRow(1);
    const headerMap = new Map();

    headerRow.eachCell((cell, colNumber) => {
      const label = String(cell.value || '').replace('*', '').trim().toLowerCase();
      const column = IMPORT_COLUMNS.find((c) => c.header.toLowerCase() === label);
      if (column) headerMap.set(colNumber, column.key);
    });

    if (!headerMap.size) throw new Error('No recognised column headers found in the workbook');

    const rows = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const record = { __row: rowNumber };
      let hasValue = false;

      headerMap.forEach((key, colNumber) => {
        const cell = row.getCell(colNumber);
        let value = cell.value;

        if (value && typeof value === 'object' && value.text) value = value.text;
        if (value && typeof value === 'object' && value.result !== undefined) value = value.result;
        if (value instanceof Date) value = formatDate(value);

        const normalised = value === null || value === undefined ? '' : String(value).trim();
        if (normalised) hasValue = true;
        record[key] = normalised;
      });

      if (hasValue) rows.push(record);
    });

    return rows;
  }

  static ensureDir = ensureDir;
}

module.exports = ExcelService;
