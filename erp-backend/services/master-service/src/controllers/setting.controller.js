'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const SettingService = require('../services/setting.service');
const SequenceService = require('../services/sequence.service');

class SettingController {
  static list = asyncHandler(async (req, res) => {
    const rows = await SettingService.list(req.query.group || null);
    return ApiResponse.ok(res, rows, 'Settings fetched');
  });

  static publicMap = asyncHandler(async (req, res) => {
    const map = await SettingService.publicMap();
    return ApiResponse.ok(res, map, 'Public settings fetched');
  });

  static groups = asyncHandler(async (req, res) => {
    const groups = await SettingService.groups();
    return ApiResponse.ok(res, { groups }, 'Setting groups fetched');
  });

  static get = asyncHandler(async (req, res) => {
    const row = await SettingService.get(req.params.key);
    return ApiResponse.ok(res, row, 'Setting fetched');
  });

  static update = asyncHandler(async (req, res) => {
    const row = await SettingService.update(req.params.key, req.body.value, req.user.id);
    return ApiResponse.ok(res, row, 'Setting updated');
  });

  static bulkUpdate = asyncHandler(async (req, res) => {
    const result = await SettingService.bulkUpdate(req.body.entries, req.user.id);
    return ApiResponse.ok(res, result, `${result.updated.length} setting(s) updated`);
  });

  static define = asyncHandler(async (req, res) => {
    const row = await SettingService.define(req.body, req.user.id);
    return ApiResponse.created(res, row, 'Setting defined');
  });

  // -------------------- Number sequences --------------------
  static listSequences = asyncHandler(async (req, res) => {
    const rows = await SequenceService.list();
    return ApiResponse.ok(res, rows, 'Sequences fetched');
  });

  static previewSequence = asyncHandler(async (req, res) => {
    const result = await SequenceService.preview(req.params.key);
    return ApiResponse.ok(res, result, 'Next number previewed');
  });

  static nextNumber = asyncHandler(async (req, res) => {
    const result = await SequenceService.next(req.params.key, req.body.count || 1, req.user.id);
    return ApiResponse.ok(res, result, 'Document number issued');
  });

  static createSequence = asyncHandler(async (req, res) => {
    const row = await SequenceService.create(req.body);
    return ApiResponse.created(res, row, 'Sequence created');
  });

  static updateSequence = asyncHandler(async (req, res) => {
    const row = await SequenceService.update(req.params.key, req.body);
    return ApiResponse.ok(res, row, 'Sequence updated');
  });
}

module.exports = SettingController;
