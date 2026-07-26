'use strict';

const Joi = require('joi');
const { OTP_PURPOSE } = require('../constants');

const password = Joi.string()
  .min(8)
  .max(72)
  .pattern(/[a-z]/, 'lowercase')
  .pattern(/[A-Z]/, 'uppercase')
  .pattern(/\d/, 'digit')
  .pattern(/[^A-Za-z0-9]/, 'special character')
  .required()
  .messages({
    'string.pattern.name': 'Password must contain at least one {#name}',
    'string.min': 'Password must be at least 8 characters'
  });

const email = Joi.string().email().lowercase().max(191).required();

module.exports = {
  register: Joi.object({
    employeeCode: Joi.string().alphanum().min(2).max(50).required(),
    firstName: Joi.string().min(2).max(100).required(),
    lastName: Joi.string().max(100).allow('', null),
    email,
    mobile: Joi.string().pattern(/^[0-9+\-\s]{8,20}$/).allow('', null),
    designation: Joi.string().max(150).allow('', null),
    password,
    roleId: Joi.string().uuid().required(),
    departmentId: Joi.string().uuid().allow(null),
    mustChangePassword: Joi.boolean().default(true),
    sendCredentials: Joi.boolean().default(false)
  }),

  login: Joi.object({
     email:Joi.string().email({ tlds: { allow: false } }).required(),
    password: Joi.string().min(1).max(72).required()
  }),

  refresh: Joi.object({
    refreshToken: Joi.string().min(20).required()
  }),

  logout: Joi.object({
    refreshToken: Joi.string().min(20).allow('', null)
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().min(1).max(72).required(),
    newPassword: password
  }),

  forgotPassword: Joi.object({ email }),

  resetPassword: Joi.object({
    token: Joi.string().length(64).required(),
    newPassword: password
  }),

  sendOtp: Joi.object({
    email,
    purpose: Joi.string()
      .valid(...Object.values(OTP_PURPOSE))
      .default(OTP_PURPOSE.LOGIN)
  }),

  verifyOtp: Joi.object({
    email,
    code: Joi.string().pattern(/^\d{4,8}$/).required(),
    purpose: Joi.string()
      .valid(...Object.values(OTP_PURPOSE))
      .default(OTP_PURPOSE.LOGIN)
  }),

  sessionParam: Joi.object({
    jti: Joi.string().uuid().required()
  })
};
