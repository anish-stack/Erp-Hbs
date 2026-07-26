'use strict';

const fs = require('fs');
const { ApiResponse, asyncHandler, ApiError } = require('@erp/shared');
const UserService = require('../services/user.service');
const BulkService = require('../services/bulk.service');
const { uploadExcel } = require('../middlewares/upload');

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function streamFile(res, filePath, fileName, { cleanup = false } = {}) {
  res.setHeader('Content-Type', XLSX_MIME);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  stream.on('close', () => {
    if (cleanup) fs.promises.unlink(filePath).catch(() => {});
  });
}

class UserController {
  static list = asyncHandler(async (req, res) => {
    const result = await UserService.list(req.query);
    return ApiResponse.paginated(res, result, 'Users fetched');
  });

  static get = asyncHandler(async (req, res) => {
    const user = await UserService.getById(req.params.id);
    return ApiResponse.ok(res, user, 'User fetched');
  });

  static me = asyncHandler(async (req, res) => {
    const user = await UserService.getById(req.user.id);
    return ApiResponse.ok(res, user, 'Profile fetched');
  });

  static updateMe = asyncHandler(async (req, res) => {
    const user = await UserService.updateOwnProfile(req.user.id, req.body);
    return ApiResponse.ok(res, user, 'Profile updated');
  });

  static create = asyncHandler(async (req, res) => {
    const user = await UserService.create(req.body, req.user.id);
    return ApiResponse.created(res, user, 'User created');
  });

  static update = asyncHandler(async (req, res) => {
    const user = await UserService.update(req.params.id, req.body, req.user.id);
    return ApiResponse.ok(res, user, 'User updated');
  });

  static remove = asyncHandler(async (req, res) => {
    const result = await UserService.remove(req.params.id, req.user.id);
    return ApiResponse.ok(res, result, 'User deleted');
  });

  static changeStatus = asyncHandler(async (req, res) => {
    const user = await UserService.changeStatus(req.params.id, req.body.status, req.user.id);
    return ApiResponse.ok(res, user, 'User status updated');
  });

  static changeRole = asyncHandler(async (req, res) => {
    const user = await UserService.changeRole(req.params.id, req.body.roleId, req.user.id);
    return ApiResponse.ok(res, user, 'User role updated');
  });

  static resetPassword = asyncHandler(async (req, res) => {
    const result = await UserService.resetPassword(req.params.id, req.body.newPassword, req.user.id);
    return ApiResponse.ok(res, result, result.message);
  });

  static unlock = asyncHandler(async (req, res) => {
    const result = await UserService.unlock(req.params.id, req.user.id);
    return ApiResponse.ok(res, result, result.message);
  });

  static directReports = asyncHandler(async (req, res) => {
    const reports = await UserService.directReports(req.params.id);
    return ApiResponse.ok(res, reports, 'Direct reports fetched');
  });

  static stats = asyncHandler(async (req, res) => {
    const stats = await UserService.stats();
    return ApiResponse.ok(res, stats, 'User statistics fetched');
  });

  // -------------------- Bulk --------------------

  static requestExport = asyncHandler(async (req, res) => {
    const result = await BulkService.requestExport(req.body || {}, req.user.id);
    return ApiResponse.accepted(res, result, 'Export queued');
  });

  static uploadImport = (req, res, next) =>
    uploadExcel(req, res, (err) => (err ? next(err) : next()));

  static requestImport = asyncHandler(async (req, res) => {
    const result = await BulkService.requestImport(req.file, req.body || {}, req.user.id);
    return ApiResponse.accepted(res, result, 'Import queued');
  });

  static bulkStatus = asyncHandler(async (req, res) => {
    const status = await BulkService.status(req.params.bulkJobId, req.user);
    return ApiResponse.ok(res, status, 'Bulk job status fetched');
  });

  static bulkList = asyncHandler(async (req, res) => {
    const result = await BulkService.list(req.query, req.user);
    return ApiResponse.paginated(res, result, 'Bulk jobs fetched');
  });

  static bulkDownload = asyncHandler(async (req, res) => {
    const { filePath, fileName } = await BulkService.resolveDownload(req.params.bulkJobId, req.user);
    if (!fs.existsSync(filePath)) throw ApiError.notFound('Export file no longer exists');
    return streamFile(res, filePath, fileName);
  });

  static importTemplate = asyncHandler(async (req, res) => {
    const { filePath, fileName } = await BulkService.buildTemplate();
    return streamFile(res, filePath, fileName, { cleanup: true });
  });
}

module.exports = UserController;
