'use strict';
const { ApiResponse, asyncHandler } = require('@erp/shared');
const NotificationService = require('../services/notification.service');

class NotificationController {
  static list = asyncHandler(async (req, res) => ApiResponse.paginated(res, await NotificationService.list(req.query, req.user.id), 'Notifications fetched'));
  static unreadCount = asyncHandler(async (req, res) => ApiResponse.ok(res, { count: await NotificationService.unreadCount(req.user.id) }, 'Unread count fetched'));
  static get = asyncHandler(async (req, res) => ApiResponse.ok(res, await NotificationService.getById(req.params.id), 'Notification fetched'));
  static markRead = asyncHandler(async (req, res) => ApiResponse.ok(res, await NotificationService.markRead(req.params.id, req.user.id), 'Marked read'));
  static markAllRead = asyncHandler(async (req, res) => ApiResponse.ok(res, await NotificationService.markAllRead(req.user.id), 'All marked read'));
  static create = asyncHandler(async (req, res) => ApiResponse.created(res, await NotificationService.dispatch(req.body), 'Notification sent'));
}
module.exports = NotificationController;
