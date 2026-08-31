'use strict';

const multer = require('multer');
const { ApiError } = require('@erp/shared');
const config = require('../config');
const { CATEGORY_MIME } = require('../constants');

const ALL_ALLOWED = [...new Set(Object.values(CATEGORY_MIME).flat())];

/**
 * Files are held in memory so they can be checksummed and magic-byte verified
 * before a single byte reaches the storage provider.
 */
const baseOptions = {
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.storage.maxFileSizeBytes,
    files: config.storage.maxFilesPerRequest
  },
  fileFilter: (req, file, cb) => {
    if (!ALL_ALLOWED.includes(file.mimetype)) {
      return cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
    }
    return cb(null, true);
  }
};

const uploadSingle = multer(baseOptions).single('file');
const uploadMultiple = multer(baseOptions).array('files', config.storage.maxFilesPerRequest);

function wrap(handler) {
  return (req, res, next) => handler(req, res, (err) => (err ? next(err) : next()));
}

module.exports = {
  single: wrap(uploadSingle),
  multiple: wrap(uploadMultiple),
  ALL_ALLOWED
};
