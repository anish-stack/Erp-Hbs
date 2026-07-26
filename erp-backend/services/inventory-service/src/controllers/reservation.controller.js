'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const ReservationService = require('../services/reservation.service');

class ReservationController {
  static list = asyncHandler(async (req, res) => {
    const result = await ReservationService.list(req.query);
    return ApiResponse.paginated(res, result, 'Reservations fetched');
  });

  static reserve = asyncHandler(async (req, res) => {
    const result = await ReservationService.reserve(req.body, req.user);
    return ApiResponse.created(res, result, 'Stock reserved');
  });

  static release = asyncHandler(async (req, res) => {
    const result = await ReservationService.release(req.params.id, req.user);
    return ApiResponse.ok(res, result, 'Reservation released');
  });

  static fulfill = asyncHandler(async (req, res) => {
    const result = await ReservationService.fulfill(req.params.id, req.body, req.user);
    return ApiResponse.ok(res, result, 'Reservation fulfilled');
  });
}

module.exports = ReservationController;
