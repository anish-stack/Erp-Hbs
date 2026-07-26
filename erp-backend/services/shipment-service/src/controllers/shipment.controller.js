'use strict';
const { ApiResponse, asyncHandler } = require('@erp/shared');
const ShipmentService = require('../services/shipment.service');

class ShipmentController {
  static list = asyncHandler(async (req, res) => ApiResponse.paginated(res, await ShipmentService.list(req.query), 'Shipments fetched'));
  static stats = asyncHandler(async (req, res) => ApiResponse.ok(res, await ShipmentService.stats(), 'Shipment statistics fetched'));
  static get = asyncHandler(async (req, res) => ApiResponse.ok(res, await ShipmentService.getById(req.params.id), 'Shipment fetched'));
  static create = asyncHandler(async (req, res) => ApiResponse.created(res, await ShipmentService.create(req.body, req.user), 'Shipment created'));
  static fromOrder = asyncHandler(async (req, res) => ApiResponse.created(res, await ShipmentService.createFromOrder(req.body.orderId, req.user), 'Shipment created from order'));
  static createPickTasks = asyncHandler(async (req, res) => ApiResponse.ok(res, await ShipmentService.createPickTasks(req.params.id, req.user), 'Pick tasks raised'));
  static pick = asyncHandler(async (req, res) => ApiResponse.ok(res, await ShipmentService.markPicked(req.params.id, req.body, req.user), 'Shipment picked'));
  static pack = asyncHandler(async (req, res) => ApiResponse.ok(res, await ShipmentService.markPacked(req.params.id, req.body, req.user), 'Shipment packed'));
  static dispatch = asyncHandler(async (req, res) => ApiResponse.ok(res, await ShipmentService.dispatch(req.params.id, req.body, req.user), 'Shipment dispatched'));
  static deliver = asyncHandler(async (req, res) => ApiResponse.ok(res, await ShipmentService.markDelivered(req.params.id, req.user), 'Shipment delivered'));
  static cancel = asyncHandler(async (req, res) => ApiResponse.ok(res, await ShipmentService.cancel(req.params.id, req.body.reason, req.user), 'Shipment cancelled'));
}
module.exports = ShipmentController;
