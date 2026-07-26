'use strict';

const HTTP_STATUS = require('./statusCodes');

class ApiResponse {
  static send(res, { statusCode = HTTP_STATUS.OK, message = 'Success', data = null, meta = null }) {
    const body = {
      success: statusCode < 400,
      message,
      data,
      requestId: res.req && res.req.id ? res.req.id : undefined,
      timestamp: new Date().toISOString()
    };
    if (meta) body.meta = meta;
    return res.status(statusCode).json(body);
  }

  static ok(res, data = null, message = 'Success', meta = null) {
    return ApiResponse.send(res, { statusCode: HTTP_STATUS.OK, message, data, meta });
  }

  static created(res, data = null, message = 'Created successfully') {
    return ApiResponse.send(res, { statusCode: HTTP_STATUS.CREATED, message, data });
  }

  static accepted(res, data = null, message = 'Accepted') {
    return ApiResponse.send(res, { statusCode: HTTP_STATUS.ACCEPTED, message, data });
  }

  static noContent(res) {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  static paginated(res, { items, total, page, limit }, message = 'Success') {
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
    return ApiResponse.send(res, {
      statusCode: HTTP_STATUS.OK,
      message,
      data: items,
      meta: {
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  }
}

module.exports = ApiResponse;
