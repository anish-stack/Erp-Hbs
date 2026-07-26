'use strict';
const ExcelJS = require('exceljs');

/** Builds an .xlsx buffer from column definitions + row objects. */
async function buildXlsx({ sheetName, columns, rows, getValue }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ERP Report Service';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName.slice(0, 31));
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 16 }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };

  for (const row of rows) {
    const record = {};
    for (const col of columns) record[col.key] = getValue(row, col.key);
    sheet.addRow(record);
  }

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  return workbook.xlsx.writeBuffer();
}

module.exports = { buildXlsx };
