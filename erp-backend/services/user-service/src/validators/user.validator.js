'use strict';

const Joi = require('joi');
const { USER_STATUS } = require('../constants');

const password = Joi.string()
  .min(8)
  .max(72)
  .pattern(/[a-z]/, 'lowercase')
  .pattern(/[A-Z]/, 'uppercase')
  .pattern(/\d/, 'digit')
  .pattern(/[^A-Za-z0-9]/, 'special character')
  .messages({ 'string.pattern.name': 'Password must contain at least one {#name}' });

const mobile = Joi.string().pattern(/^[0-9+\-\s]{8,20}$/).messages({
  'string.pattern.base': 'Mobile number format is invalid'
});

module.exports = {
  list: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(150).allow(''),
    sortBy: Joi.string().valid('createdAt', 'firstName', 'email', 'employeeCode', 'lastLoginAt'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    status: Joi.string().valid(...Object.values(USER_STATUS)),
    roleId: Joi.string().uuid(),
    departmentId: Joi.string().uuid(),
    reportsToId: Joi.string().uuid(),
    isEmailVerified: Joi.boolean(),
    dateFrom: Joi.date(),
    dateTo: Joi.date()
  }),

  idParam: Joi.object({ id: Joi.string().uuid().required() }),

  create: Joi.object({
    employeeCode: Joi.string().alphanum().min(2).max(50).required(),
    firstName: Joi.string().min(2).max(100).required(),
    lastName: Joi.string().max(100).allow('', null),
    email: Joi.string().email().lowercase().max(191).required(),
    mobile: mobile.allow('', null),
    designation: Joi.string().max(150).allow('', null),
    password: password.required(),
    roleId: Joi.string().uuid().required(),
    departmentId: Joi.string().uuid().allow(null),
    reportsToId: Joi.string().uuid().allow(null),
    dateOfBirth: Joi.date().less('now').allow(null),
    dateOfJoining: Joi.date().allow(null),
    timezone: Joi.string().max(64),
    locale: Joi.string().max(16),
    notes: Joi.string().max(1000).allow('', null),
    status: Joi.string().valid(...Object.values(USER_STATUS)),
    mustChangePassword: Joi.boolean().default(true)
  }),

  update: Joi.object({
    employeeCode: Joi.string().alphanum().min(2).max(50),
    firstName: Joi.string().min(2).max(100),
    lastName: Joi.string().max(100).allow('', null),
    email: Joi.string().email().lowercase().max(191),
    mobile: mobile.allow('', null),
    designation: Joi.string().max(150).allow('', null),
    roleId: Joi.string().uuid(),
    departmentId: Joi.string().uuid().allow(null),
    reportsToId: Joi.string().uuid().allow(null),
    dateOfBirth: Joi.date().less('now').allow(null),
    dateOfJoining: Joi.date().allow(null),
    avatarUrl: Joi.string().uri().max(500).allow('', null),
    timezone: Joi.string().max(64),
    locale: Joi.string().max(16),
    notes: Joi.string().max(1000).allow('', null)
  }).min(1),

  updateProfile: Joi.object({
    firstName: Joi.string().min(2).max(100),
    lastName: Joi.string().max(100).allow('', null),
    mobile: mobile.allow('', null),
    avatarUrl: Joi.string().uri().max(500).allow('', null),
    timezone: Joi.string().max(64),
    locale: Joi.string().max(16),
    dateOfBirth: Joi.date().less('now').allow(null)
  }).min(1),

  changeStatus: Joi.object({
    status: Joi.string().valid(...Object.values(USER_STATUS)).required(),
    reason: Joi.string().max(255).allow('', null)
  }),

  changeRole: Joi.object({ roleId: Joi.string().uuid().required() }),

  resetPassword: Joi.object({ newPassword: password.required() }),

  exportRequest: Joi.object({
    status: Joi.string().valid(...Object.values(USER_STATUS)),
    roleId: Joi.string().uuid(),
    departmentId: Joi.string().uuid(),
    search: Joi.string().max(150).allow(''),
    dateFrom: Joi.date(),
    dateTo: Joi.date()
  }),

  importRequest: Joi.object({
    defaultPassword: password.allow('', null)
  }),

  bulkParam: Joi.object({ bulkJobId: Joi.string().uuid().required() }),

  bulkList: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    type: Joi.string().valid('EXPORT', 'IMPORT'),
    status: Joi.string().valid('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL'),
    sortBy: Joi.string().valid('createdAt', 'status', 'type'),
    sortOrder: Joi.string().valid('asc', 'desc')
  })
};
