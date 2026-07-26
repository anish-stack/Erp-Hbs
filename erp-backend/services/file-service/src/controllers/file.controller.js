'use strict';

const { ApiResponse, asyncHandler, ApiError } = require('@erp/shared');
const FileService = require('../services/file.service');
const ShareService = require('../services/share.service');
const { getProvider, availability, activeKind } = require('../services/providers');
const FileRepository = require('../repositories/file.repository');
const config = require('../config');

function sendStream(res, stream, file, disposition = 'inline') {
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Length', file.sizeBytes);
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${encodeURIComponent(file.originalName)}"`
  );
  res.setHeader('Cache-Control', file.visibility === 'PUBLIC' ? 'public, max-age=86400' : 'private, no-store');
  return stream.pipe(res);
}

class FileController {
  static upload = asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No file supplied under field "file"');

    const file = await FileService.upload(
      { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype },
      req.body,
      req.user
    );

    return ApiResponse.created(res, file, file.deduplicated ? 'Identical file already stored' : 'File uploaded');
  });

  static uploadMany = asyncHandler(async (req, res) => {
    if (!req.files || !req.files.length) throw ApiError.badRequest('No files supplied under field "files"');

    const result = await FileService.uploadMany(req.files, req.body, req.user);
    return ApiResponse.created(res, result, `${result.uploaded.length}/${result.total} file(s) uploaded`);
  });

  static list = asyncHandler(async (req, res) => {
    const result = await FileService.list(req.query, req.user);
    return ApiResponse.paginated(res, result, 'Files fetched');
  });

  static get = asyncHandler(async (req, res) => {
    const file = await FileService.getById(req.params.id, req.user);
    return ApiResponse.ok(res, file, 'File fetched');
  });

  static forEntity = asyncHandler(async (req, res) => {
    const files = await FileService.listForEntity(req.params.entity, req.params.entityId, req.user);
    return ApiResponse.ok(res, files, 'Entity files fetched');
  });

  static signedUrl = asyncHandler(async (req, res) => {
    const result = await FileService.signedUrl(
      req.params.id,
      req.user,
      req.query.ttlSeconds ? Number(req.query.ttlSeconds) : config.storage.signedUrlTtl
    );
    return ApiResponse.ok(res, result, 'Signed URL generated');
  });

  static download = asyncHandler(async (req, res) => {
    const { stream, file } = await FileService.openStream(req.params.id, req.user);
    return sendStream(res, stream, file, 'attachment');
  });

  static preview = asyncHandler(async (req, res) => {
    const { stream, file } = await FileService.openStream(req.params.id, req.user);
    return sendStream(res, stream, file, 'inline');
  });

  static attach = asyncHandler(async (req, res) => {
    const file = await FileService.attach(req.params.id, req.body, req.user);
    return ApiResponse.ok(res, file, 'File attached');
  });

  static replace = asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No replacement file supplied');

    const result = await FileService.replace(
      req.params.id,
      { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype },
      req.user
    );
    return ApiResponse.ok(res, result, 'File replaced');
  });

  static remove = asyncHandler(async (req, res) => {
    const result = await FileService.remove(req.params.id, req.user);
    return ApiResponse.ok(res, result, 'File deleted');
  });

  static stats = asyncHandler(async (req, res) => {
    const stats = await FileService.stats();
    return ApiResponse.ok(res, stats, 'Storage statistics fetched');
  });

  static providers = asyncHandler(async (req, res) => {
    const provider = getProvider();
    return ApiResponse.ok(
      res,
      { active: activeKind(), healthy: await provider.healthy(), providers: availability() },
      'Storage providers fetched'
    );
  });

  // -------------------- Sharing --------------------

  static createShare = asyncHandler(async (req, res) => {
    const share = await ShareService.create(req.params.id, req.body, req.user);
    return ApiResponse.created(res, share, 'Share link created');
  });

  static listShares = asyncHandler(async (req, res) => {
    const shares = await ShareService.list(req.params.id, req.user);
    return ApiResponse.ok(res, shares, 'Share links fetched');
  });

  static revokeShare = asyncHandler(async (req, res) => {
    const result = await ShareService.revoke(req.params.shareId, req.params.id, req.user);
    return ApiResponse.ok(res, result, 'Share link revoked');
  });

  /** Public: no authentication, the token is the credential. */
  static openShared = asyncHandler(async (req, res) => {
    const { stream, file } = await ShareService.resolve(req.params.token);
    return sendStream(res, stream, file, 'inline');
  });

  /** Public: HMAC-signed local object access (local provider only). */
  static rawLocal = asyncHandler(async (req, res) => {
    const provider = getProvider();
    if (!provider.supportsDirectServe()) throw ApiError.notFound('Direct serving is disabled');

    const key = decodeURIComponent(req.params[0]);
    if (!provider.verify(key, req.query.expires, req.query.signature)) {
      throw ApiError.forbidden('Signature is invalid or has expired');
    }

    const file = await FileRepository.findByKey(key);
    const stream = await provider.getStream(key);

    res.setHeader('Content-Type', file ? file.mimeType : 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return stream.pipe(res);
  });

  /** Public: unsigned access, only ever used for PUBLIC files. */
  static staticLocal = asyncHandler(async (req, res) => {
    const provider = getProvider();
    if (!provider.supportsDirectServe()) throw ApiError.notFound('Direct serving is disabled');

    const key = decodeURIComponent(req.params[0]);
    const file = await FileRepository.findByKey(key);

    if (!file || file.visibility !== 'PUBLIC') throw ApiError.notFound('File not found');

    const stream = await provider.getStream(key);
    return sendStream(res, stream, file, 'inline');
  });
}

module.exports = FileController;
