'use strict';

const { ApiResponse, asyncHandler, ApiError } = require('@erp/shared');
const AuthService = require('../services/auth.service');
const contextOf = require('../utils/requestContext');

function refreshTokenFrom(req) {
  return (
    (req.body && req.body.refreshToken) ||
    req.headers['x-refresh-token'] ||
    (req.cookies && req.cookies.refreshToken) ||
    null
  );
}

class AuthController {
  static register = asyncHandler(async (req, res) => {
    const actorId = req.user ? req.user.id : null;
    const user = await AuthService.register(req.body, contextOf(req), actorId);
    return ApiResponse.created(res, user, 'User registered successfully');
  });

  static login = asyncHandler(async (req, res) => {
    const result = await AuthService.login(req.body, contextOf(req));
    return ApiResponse.ok(res, result, 'Login successful');
  });

  static refresh = asyncHandler(async (req, res) => {
    const token = refreshTokenFrom(req);
    console.log("Token and refres",token)
    if (!token) throw ApiError.badRequest('Refresh token is required');
    const result = await AuthService.refresh(token, contextOf(req));
    return ApiResponse.ok(res, result, 'Token refreshed');
  });

  static logout = asyncHandler(async (req, res) => {
    await AuthService.logout(
      { userId: req.user.id, accessJti: req.user.jti },
      refreshTokenFrom(req),
      contextOf(req)
    );
    return ApiResponse.ok(res, null, 'Logged out successfully');
  });

  static logoutAll = asyncHandler(async (req, res) => {
    const result = await AuthService.logoutAll(req.user.id, contextOf(req));
    return ApiResponse.ok(res, result, 'All sessions revoked');
  });

  static me = asyncHandler(async (req, res) => {
    const user = await AuthService.profile(req.user.id);
    console.log("User data",user)
    return ApiResponse.ok(res, user, 'Profile fetched');
  });

  static permissions = asyncHandler(async (req, res) => {
    console.log("User permissions", req.user);
    const permissions = await AuthService.permissions(req.user.id);
    return ApiResponse.ok(res, { permissions }, 'Permissions fetched');
  });

  static changePassword = asyncHandler(async (req, res) => {
    const result = await AuthService.changePassword(req.user.id, req.body, contextOf(req));
    return ApiResponse.ok(res, result, result.message);
  });

  static forgotPassword = asyncHandler(async (req, res) => {
    const result = await AuthService.forgotPassword(req.body.email, contextOf(req));
    return ApiResponse.ok(res, null, result.message);
  });

  static resetPassword = asyncHandler(async (req, res) => {
    const result = await AuthService.resetPassword(req.body, contextOf(req));
    return ApiResponse.ok(res, null, result.message);
  });

  static sendOtp = asyncHandler(async (req, res) => {
    const result = await AuthService.sendOtp(req.body, contextOf(req));
    return ApiResponse.ok(res, null, result.message);
  });

  static verifyOtp = asyncHandler(async (req, res) => {
    const result = await AuthService.verifyOtp(req.body, contextOf(req));
    return ApiResponse.ok(res, result, 'OTP verified');
  });

  static sessions = asyncHandler(async (req, res) => {
    const sessions = await AuthService.listSessions(req.user.id);
    return ApiResponse.ok(res, sessions, 'Active sessions fetched');
  });

  static revokeSession = asyncHandler(async (req, res) => {
    const result = await AuthService.revokeSession(req.user.id, req.params.jti);
    return ApiResponse.ok(res, result, 'Session revoked');
  });
}

module.exports = AuthController;
