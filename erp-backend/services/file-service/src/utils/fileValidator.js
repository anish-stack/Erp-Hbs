'use strict';

const path = require('path');
const crypto = require('crypto');
const { ApiError } = require('@erp/shared');
const {
  CATEGORY_MIME,
  MAGIC_SIGNATURES,
  ZIP_CONTAINER_MIMES,
  FILE_CATEGORY
} = require('../constants');
const config = require('../config');

const DANGEROUS_EXTENSIONS = [
  '.exe', '.dll', '.bat', '.cmd', '.sh', '.com', '.scr', '.msi',
  '.js', '.jar', '.php', '.py', '.rb', '.ps1', '.vbs', '.html', '.htm', '.svg'
];

/** Reads the leading bytes and reports what the file actually is. */
function sniffMime(buffer) {
  for (const signature of MAGIC_SIGNATURES) {
    const slice = buffer.subarray(signature.offset, signature.offset + signature.bytes.length);
    if (slice.length !== signature.bytes.length) continue;
    if (signature.bytes.every((byte, index) => slice[index] === byte)) return signature.mime;
  }
  return null;
}

/** Text formats have no reliable signature, so they are trusted by extension. */
function isSignatureless(mimeType) {
  return mimeType === 'text/plain' || mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel';
}

function assertExtension(originalName) {
  const extension = path.extname(originalName).toLowerCase();

  if (!extension) throw ApiError.badRequest('File must have an extension');
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    throw ApiError.badRequest(`Files of type ${extension} are not allowed`, { extension });
  }
  if (originalName.includes('\0') || originalName.includes('..')) {
    throw ApiError.badRequest('File name contains illegal characters');
  }

  return extension;
}

/**
 * Full upload validation: size, category whitelist, extension blacklist and
 * magic-byte verification so a renamed executable cannot pose as a PDF.
 */
function validate({ buffer, originalName, mimeType, category = FILE_CATEGORY.OTHER }) {
  if (!buffer || !buffer.length) throw ApiError.badRequest('Uploaded file is empty');

  if (buffer.length > config.storage.maxFileSizeBytes) {
    throw ApiError.badRequest(
      `File exceeds the ${Math.round(config.storage.maxFileSizeBytes / 1048576)} MB limit`,
      { sizeBytes: buffer.length }
    );
  }

  const extension = assertExtension(originalName);

  const allowed = CATEGORY_MIME[category] || CATEGORY_MIME.OTHER;
  if (!allowed.includes(mimeType)) {
    throw ApiError.badRequest(`${mimeType} is not allowed for category ${category}`, {
      allowed
    });
  }

  const sniffed = sniffMime(buffer);

  if (!isSignatureless(mimeType)) {
    if (!sniffed) {
      throw ApiError.badRequest('File content could not be verified against its type');
    }

    const zipContainerMatch = sniffed === 'zip' && ZIP_CONTAINER_MIMES.includes(mimeType);
    if (sniffed !== mimeType && !zipContainerMatch) {
      throw ApiError.badRequest('File content does not match its declared type', {
        declared: mimeType,
        detected: sniffed
      });
    }
  }

  return {
    extension,
    sizeBytes: buffer.length,
    checksum: crypto.createHash('sha256').update(buffer).digest('hex'),
    detectedMime: sniffed
  };
}

module.exports = { validate, sniffMime, assertExtension, DANGEROUS_EXTENSIONS };
