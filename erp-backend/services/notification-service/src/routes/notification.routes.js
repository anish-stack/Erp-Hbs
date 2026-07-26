'use strict';
const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const NotificationController = require('../controllers/notification.controller');
const PreferenceController = require('../controllers/preference.controller');
const v = require('../validators/notification.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;
const router = express.Router();

router.get('/', authorize(P.notification.VIEW), validate(v.list, 'query'), NotificationController.list);
router.post('/', authorize(P.notification.CREATE), validate(v.create), NotificationController.create);
router.get('/unread-count', authorize(P.notification.VIEW), NotificationController.unreadCount);
router.post('/mark-all-read', authorize(P.notification.UPDATE), NotificationController.markAllRead);
router.get('/preferences', authorize(P.notification.VIEW), PreferenceController.get);
router.put('/preferences', authorize(P.notification.UPDATE), validate(v.preferenceUpdate), PreferenceController.update);
router.get('/:id', authorize(P.notification.VIEW), validate(v.idParam, 'params'), NotificationController.get);
router.post('/:id/read', authorize(P.notification.UPDATE), validate(v.idParam, 'params'), NotificationController.markRead);

module.exports = router;
