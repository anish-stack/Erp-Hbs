'use strict';

const { ApiError, utils } = require('@erp/shared');
const FileRepository = require('../repositories/file.repository');
const ShareRepository = require('../repositories/share.repository');
const { getProviderFor } = require('./providers');
const FileService = require('./file.service');
const publisher = require('../events/publisher');
const config = require('../config');

class ShareService {
  /** Creates an unguessable public link for a private file. */
  static async create(fileId, payload, user) {
    const file = await FileRepository.findById(fileId);
    if (!file) throw ApiError.notFound('File not found');
    FileService.assertReadable(file, user);

    const token = utils.password.randomToken(32);
    const expiresAt = new Date(Date.now() + (payload.expiresInMinutes || 1440) * 60000);

    const share = await ShareRepository.create({
      fileId,
      token,
      expiresAt,
      maxUses: payload.maxUses || null,
      note: payload.note || null,
      createdBy: user.id
    });

    await publisher.audit(
      {
        entity: 'file',
        entityId: fileId,
        action: 'UPDATE',
        severity: 'WARNING',
        summary: `Share link created, expires ${expiresAt.toISOString()}`
      },
      user.id
    );

    return {
      id: share.id,
      url: `${config.publicBaseUrl}${config.basePath}/files/shared/${token}`,
      token,
      expiresAt,
      maxUses: share.maxUses
    };
  }

  static async list(fileId, user) {
    const file = await FileRepository.findById(fileId);
    if (!file) throw ApiError.notFound('File not found');
    FileService.assertReadable(file, user);

    const shares = await ShareRepository.listForFile(fileId);

    return shares.map((share) => ({
      id: share.id,
      url: `${config.publicBaseUrl}${config.basePath}/files/shared/${share.token}`,
      expiresAt: share.expiresAt,
      maxUses: share.maxUses,
      useCount: share.useCount,
      expired: share.expiresAt < new Date(),
      note: share.note,
      createdAt: share.createdAt
    }));
  }

  /** Public resolution: validates expiry and use limits before streaming. */
  static async resolve(token) {
    const share = await ShareRepository.findByToken(token);

    if (!share || share.revokedAt) throw ApiError.notFound('Share link is invalid');
    if (share.expiresAt < new Date()) throw ApiError.forbidden('Share link has expired');
    if (share.maxUses !== null && share.useCount >= share.maxUses) {
      throw ApiError.forbidden('Share link has reached its usage limit');
    }
    if (!share.file || share.file.deletedAt) throw ApiError.notFound('File no longer exists');

    await ShareRepository.registerUse(share.id);
    await FileRepository.registerAccess(share.fileId).catch(() => {});

    const provider = getProviderFor(share.file);
    const stream = await provider.getStream(share.file.storageKey);

    return { stream, file: share.file };
  }

  static async revoke(shareId, fileId, user) {
    const file = await FileRepository.findById(fileId);
    if (!file) throw ApiError.notFound('File not found');
    FileService.assertReadable(file, user);

    await ShareRepository.revoke(shareId);
    return { revoked: true };
  }
}

module.exports = ShareService;
