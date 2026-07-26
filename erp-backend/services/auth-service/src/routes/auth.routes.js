'use strict';

const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const AuthController = require('../controllers/auth.controller');
const validators = require('../validators/auth.validator');
const gatewayIdentity = require('../middlewares/gatewayIdentity');

const { validate, authorize, authLimiter, createRateLimiter } = middlewares;
const PERMISSIONS = constants.PERMISSIONS;

const router = express.Router();

const strictLimiter = authLimiter();
const otpLimiter = createRateLimiter({
  windowMs: 300000,
  max: 5,
  keyGenerator: (req) => `otp:${req.ip}:${(req.body && req.body.email) || 'anon'}`
});

// -------------------- Public --------------------
router.post(
  '/login',
  strictLimiter,
  (req, res, next) => {
    console.log("Body data come",req.body);
    next();
  },
  validate(validators.login),
  AuthController.login
);router.post('/refresh', validate(validators.refresh), AuthController.refresh);
router.post('/forgot-password', strictLimiter, validate(validators.forgotPassword), AuthController.forgotPassword);
router.post('/reset-password', strictLimiter, validate(validators.resetPassword), AuthController.resetPassword);
router.post('/send-otp', otpLimiter, validate(validators.sendOtp), AuthController.sendOtp);
router.post('/resend-otp', otpLimiter, validate(validators.sendOtp), AuthController.sendOtp);
router.post('/verify-otp', otpLimiter, validate(validators.verifyOtp), AuthController.verifyOtp);

// -------------------- Authenticated --------------------
router.use(gatewayIdentity);

router.get('/me', AuthController.me);
router.get('/permissions', AuthController.permissions);
router.get('/sessions', AuthController.sessions);
router.delete('/sessions/:jti', validate(validators.sessionParam, 'params'), AuthController.revokeSession);
router.post('/logout', validate(validators.logout), AuthController.logout);
router.post('/logout-all', AuthController.logoutAll);
router.post('/change-password', validate(validators.changePassword), AuthController.changePassword);

// -------------------- Administrative --------------------
router.post(
  '/register',
  authorize(PERMISSIONS.user.CREATE),
  validate(validators.register),
  AuthController.register
);

module.exports = router;
