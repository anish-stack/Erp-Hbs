'use strict';

const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const SettingController = require('../controllers/setting.controller');
const v = require('../validators/master.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;

const settings = express.Router();
settings.get('/public', SettingController.publicMap);
settings.get('/groups', authorize(P.setting.VIEW), SettingController.groups);
settings.get('/', authorize(P.setting.VIEW), SettingController.list);
settings.post('/', authorize(P.setting.CREATE), validate(v.settingDefine), SettingController.define);
settings.put('/bulk', authorize(P.setting.UPDATE), validate(v.settingBulk), SettingController.bulkUpdate);
settings.get('/:key', authorize(P.setting.VIEW), validate(v.settingKey, 'params'), SettingController.get);
settings.put('/:key', authorize(P.setting.UPDATE), validate(v.settingKey, 'params'), validate(v.settingUpdate), SettingController.update);

const sequences = express.Router();
sequences.get('/', authorize(P.setting.VIEW), SettingController.listSequences);
sequences.post('/', authorize(P.setting.CREATE), validate(v.sequenceCreate), SettingController.createSequence);
sequences.get('/:key/preview', validate(v.sequenceKey, 'params'), SettingController.previewSequence);
sequences.post('/:key/next', validate(v.sequenceKey, 'params'), validate(v.sequenceNext), SettingController.nextNumber);
sequences.put('/:key', authorize(P.setting.UPDATE), validate(v.sequenceKey, 'params'), validate(v.sequenceUpdate), SettingController.updateSequence);

module.exports = { settings, sequences };
