'use strict';

const STORAGE_KIND = { R2: 'R2', CLOUDINARY: 'CLOUDINARY', LOCAL: 'LOCAL' };

const VISIBILITY = { PUBLIC: 'PUBLIC', PRIVATE: 'PRIVATE' };

const FILE_CATEGORY = {
  IMAGE: 'IMAGE',
  DOCUMENT: 'DOCUMENT',
  SPREADSHEET: 'SPREADSHEET',
  INVOICE: 'INVOICE',
  CERTIFICATE: 'CERTIFICATE',
  DATASHEET: 'DATASHEET',
  AVATAR: 'AVATAR',
  OTHER: 'OTHER'
};

const PROCESS_STATUS = {
  NONE: 'NONE',
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  DONE: 'DONE',
  FAILED: 'FAILED'
};

/** Allowed mime types per category. Anything else is rejected at upload. */
const CATEGORY_MIME = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
  AVATAR: ['image/jpeg', 'image/png', 'image/webp'],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv'
  ],
  SPREADSHEET: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ],
  INVOICE: ['application/pdf', 'image/jpeg', 'image/png'],
  CERTIFICATE: ['application/pdf', 'image/jpeg', 'image/png'],
  DATASHEET: ['application/pdf'],
  OTHER: [
    'application/pdf',
    'application/zip',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};

/** Magic byte signatures used to verify the declared mime type. */
const MAGIC_SIGNATURES = [
  { mime: 'application/pdf', offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: 'image/jpeg', offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/gif', offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  { mime: 'zip', offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }
];

/** Office formats and zip share the same container signature. */
const ZIP_CONTAINER_MIMES = [
  'application/zip',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
];

const QUEUE_NAMES = { FILE: 'file.processing' };

const JOB_NAMES = {
  PROCESS_IMAGE: 'process-image',
  PURGE_OBJECTS: 'purge-objects',
  CLEAN_ORPHANS: 'clean-orphans'
};

const CACHE = {
  file: (id) => `file:${id}`,
  pattern: 'file:*'
};

module.exports = {
  STORAGE_KIND,
  VISIBILITY,
  FILE_CATEGORY,
  PROCESS_STATUS,
  CATEGORY_MIME,
  MAGIC_SIGNATURES,
  ZIP_CONTAINER_MIMES,
  QUEUE_NAMES,
  JOB_NAMES,
  CACHE
};
