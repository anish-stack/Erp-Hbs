'use strict';

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { ApiError } = require('@erp/shared');
const config = require('../config');

const ALLOWED_MIME = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
];

if (!fs.existsSync(config.bulk.importDir)) {
  fs.mkdirSync(config.bulk.importDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.bulk.importDir),
  filename: (req, file, cb) => {
    const safe = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const uploadExcel = multer({
  storage,
  limits: { fileSize: config.bulk.maxImportFileMb * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME.includes(file.mimetype) && !['.xlsx', '.xls'].includes(extension)) {
      return cb(ApiError.badRequest('Only .xlsx or .xls files are accepted'));
    }
    return cb(null, true);
  }
}).single('file');

module.exports = { uploadExcel };
