'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const TaskService = require('../services/task.service');

class TaskController {
  static list = asyncHandler(async (req, res) => {
    const result = await TaskService.list(req.query);
    return ApiResponse.paginated(res, result, 'Tasks fetched');
  });

  static get = asyncHandler(async (req, res) => {
    const task = await TaskService.getById(req.params.taskId);
    return ApiResponse.ok(res, task, 'Task fetched');
  });

  static create = asyncHandler(async (req, res) => {
    const task = await TaskService.create(req.body, req.user);
    return ApiResponse.created(res, task, 'Task created');
  });

  static assign = asyncHandler(async (req, res) => {
    const task = await TaskService.assign(req.params.taskId, req.body.assignedTo, req.user);
    return ApiResponse.ok(res, task, 'Task assigned');
  });

  static start = asyncHandler(async (req, res) => {
    const task = await TaskService.start(req.params.taskId);
    return ApiResponse.ok(res, task, 'Task started');
  });

  static complete = asyncHandler(async (req, res) => {
    const task = await TaskService.complete(req.params.taskId, req.body, req.user);
    return ApiResponse.ok(res, task, 'Task completed');
  });

  static cancel = asyncHandler(async (req, res) => {
    const task = await TaskService.cancel(req.params.taskId, req.body.reason, req.user);
    return ApiResponse.ok(res, task, 'Task cancelled');
  });
}

module.exports = TaskController;
