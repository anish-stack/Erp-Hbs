'use strict';

const { ApiError, utils, cache, logger, middlewares } = require('@erp/shared');
const FileRepository = require('../repositories/file.repository');
const PurgeTaskRepository = require('../repositories/purgeTask.repository');
const { getProvider, getProviderFor, activeKind } = require('./providers');
const { validate } = require('../utils/fileValidator');
const { buildKey } = require('../utils/keyBuilder');
const publisher = require('../events/publisher');
const config = require('../config');
const { VISIBILITY, FILE_CATEGORY, PROCESS_STATUS, CACHE } = require('../constants');

const { hasPermission } = middlewares;

const IMAGE_CATEGORIES = [FILE_CATEGORY.IMAGE, FILE_CATEGORY.AVATAR];

function shape(file, extras = {}) {
  return {
    id: file.id,
    originalName: file.originalName,
    fileName: file.fileName,
    extension: file.extension,
    mimeType: file.mimeType,
    category: file.category,
    sizeBytes: file.sizeBytes,
    sizeReadable: `${(file.sizeBytes / 1024).toFixed(1)} KB`,
    checksum: file.checksum,
    provider: file.provider,
    visibility: file.visibility,
    entity: file.entity,
    entityId: file.entityId,
    tag: file.tag,
    width: file.width,
    height: file.height,
    variants: file.variants || null,
    processStatus: file.processStatus,
    downloadCount: file.downloadCount,
    publicUrl: file.publicUrl,
    uploadedBy: file.uploadedBy,
    createdAt: file.createdAt,
    ...extras
  };
}

/** Owner or an explicit file permission; private files are never public by accident. */
function assertReadable(file, user) {
  if (file.visibility === VISIBILITY.PUBLIC) return true;
  if (file.uploadedBy === user.id) return true;
  if (hasPermission(user.permissions, 'file.view')) return true;
  throw ApiError.forbidden('You do not have access to this file');
}

function assertWritable(file, user) {
  if (file.uploadedBy === user.id) return true;
  if (hasPermission(user.permissions, 'file.delete')) return true;
  throw ApiError.forbidden('You cannot modify this file');
}

class FileService {
  static async upload({ buffer, originalName, mimeType }, options, user) {
    const category = options.category || FILE_CATEGORY.OTHER;
    const visibility = options.visibility || VISIBILITY.PRIVATE;

    const verified = validate({ buffer, originalName, mimeType, category });

    const duplicate = await FileRepository.findByChecksum(verified.checksum, user.id);
    if (duplicate && options.deduplicate !== false) {
      logger.info('Duplicate upload short-circuited to file %s', duplicate.id);
      return shape(duplicate, { deduplicated: true });
    }

    const { key, fileName } = buildKey({ originalName, entity: options.entity, category });
    const provider = getProvider();

    const stored = await provider.put({
      buffer,
      key,
      mimeType,
      visibility,
      metadata: {
        uploadedBy: user.id,
        entity: options.entity || '',
        entityId: options.entityId || ''
      }
    });

    const needsProcessing = IMAGE_CATEGORIES.includes(category) && mimeType.startsWith('image/');

    const file = await FileRepository.create({
      storageKey: key,
      provider: stored.provider,
      bucket: stored.bucket,
      originalName,
      fileName,
      extension: verified.extension,
      mimeType,
      category,
      sizeBytes: verified.sizeBytes,
      checksum: verified.checksum,
      visibility,
      publicUrl: stored.publicUrl || null,
      entity: options.entity || null,
      entityId: options.entityId || null,
      tag: options.tag || null,
      width: stored.width || null,
      height: stored.height || null,
      metadata: options.metadata || null,
      processStatus: needsProcessing ? PROCESS_STATUS.QUEUED : PROCESS_STATUS.NONE,
      uploadedBy: user.id
    });

    await publisher.uploaded(file, user.id);

    if (needsProcessing) {
      // Lazy require breaks the cycle between the queue and this service.
      const { enqueueImageProcessing } = require('../queues/file.queue');
      await enqueueImageProcessing({ fileId: file.id });
    }

    return shape(file, { queuedForProcessing: needsProcessing });
  }

  static async uploadMany(files, options, user) {
    const results = [];
    const failures = [];

    for (const file of files) {
      try {
        results.push(
          await FileService.upload(
            { buffer: file.buffer, originalName: file.originalname, mimeType: file.mimetype },
            options,
            user
          )
        );
      } catch (err) {
        failures.push({ originalName: file.originalname, error: err.message });
      }
    }

    return { uploaded: results, failed: failures, total: files.length };
  }

  static async list(query, user) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['createdAt', 'sizeBytes', 'originalName', 'downloadCount'],
      defaultSortField: 'createdAt'
    });

    const where = {
      deletedAt: null,
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.visibility ? { visibility: query.visibility } : {}),
      ...(query.tag ? { tag: query.tag } : {}),
      ...(query.mimeType ? { mimeType: query.mimeType } : {}),
      ...(query.search ? { originalName: { contains: query.search } } : {})
    };

    // Without file.view a caller only sees their own uploads.
    if (!hasPermission(user.permissions, 'file.view')) where.uploadedBy = user.id;

    const { items, total } = await FileRepository.paginate({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy
    });

    return { items: items.map((file) => shape(file)), total, page: pagination.page, limit: pagination.limit };
  }

  static async getById(id, user) {
    const cached = await cache.get(CACHE.file(id));
    const file = cached || (await FileRepository.findById(id));

    if (!file) throw ApiError.notFound('File not found');
    assertReadable(file, user);

    if (!cached) await cache.set(CACHE.file(id), file, 300);
    return shape(file);
  }

  static async listForEntity(entity, entityId, user) {
    const files = await FileRepository.listForEntity(entity, entityId);
    const readable = files.filter((file) => {
      try {
        return assertReadable(file, user);
      } catch (err) {
        return false;
      }
    });
    return readable.map((file) => shape(file));
  }

  /** Time-boxed direct URL, or a service-signed URL for the local provider. */
  static async signedUrl(id, user, ttlSeconds = config.storage.signedUrlTtl) {
    const file = await FileRepository.findById(id);
    if (!file) throw ApiError.notFound('File not found');
    assertReadable(file, user);

    const provider = getProviderFor(file);
    const url = await provider.signedUrl(file.storageKey, ttlSeconds);

    return {
      fileId: file.id,
      url,
      provider: file.provider,
      expiresIn: ttlSeconds,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000)
    };
  }

  static async openStream(id, user) {
    const file = await FileRepository.findById(id);
    if (!file) throw ApiError.notFound('File not found');
    assertReadable(file, user);

    const provider = getProviderFor(file);
    const stream = await provider.getStream(file.storageKey);

    await FileRepository.registerAccess(file.id).catch(() => {});

    return { stream, file };
  }

  /** Attaches an already-uploaded file to a business record. */
  static async attach(id, { entity, entityId, tag }, user) {
    const file = await FileRepository.findById(id);
    if (!file) throw ApiError.notFound('File not found');
    assertWritable(file, user);

    const updated = await FileRepository.update(id, {
      entity,
      entityId,
      tag: tag || file.tag
    });

    await cache.del(CACHE.file(id));
    await publisher.audit(
      { entity: 'file', entityId: id, action: 'UPDATE', summary: `Attached to ${entity}:${entityId}` },
      user.id
    );

    return shape(updated);
  }

  static async replace(id, { buffer, originalName, mimeType }, user) {
    const existing = await FileRepository.findById(id);
    if (!existing) throw ApiError.notFound('File not found');
    assertWritable(existing, user);

    const uploaded = await FileService.upload(
      { buffer, originalName, mimeType },
      {
        category: existing.category,
        visibility: existing.visibility,
        entity: existing.entity,
        entityId: existing.entityId,
        tag: existing.tag,
        deduplicate: false
      },
      user
    );

    await FileService.remove(id, user, { silent: true });

    return { replacedFileId: id, file: uploaded };
  }

  /** Soft delete now, physical delete queued so provider outages never block. */
  static async remove(id, user, options = {}) {
    const file = await FileRepository.findById(id);
    if (!file) throw ApiError.notFound('File not found');
    assertWritable(file, user);

    await FileRepository.softDelete(id, user.id);

    await PurgeTaskRepository.create({
      fileId: file.id,
      storageKey: file.storageKey,
      provider: file.provider,
      bucket: file.bucket,
      variants: file.variants || null
    });

    await cache.del(CACHE.file(id));

    if (!options.silent) await publisher.deleted(file, user.id);

    return { deleted: true, purgeQueued: true };
  }

  static async stats() {
    const raw = await FileRepository.stats();

    return {
      totalFiles: raw.totals._count._all,
      totalBytes: raw.totals._sum.sizeBytes || 0,
      totalDownloads: raw.totals._sum.downloadCount || 0,
      activeProvider: activeKind(),
      byCategory: raw.byCategory.map((row) => ({
        category: row.category,
        count: row._count._all,
        bytes: row._sum.sizeBytes || 0
      })),
      byProvider: raw.byProvider.map((row) => ({
        provider: row.provider,
        count: row._count._all,
        bytes: row._sum.sizeBytes || 0
      }))
    };
  }

  static shape = shape;
  static assertReadable = assertReadable;
}

module.exports = FileService;
