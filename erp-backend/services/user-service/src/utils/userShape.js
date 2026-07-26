'use strict';

function fullName(user) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ');
}

function shape(user) {
  if (!user) return null;
  return {
    id: user.id,
    employeeCode: user.employeeCode,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: fullName(user),
    email: user.email,
    mobile: user.mobile,
    designation: user.designation,
    avatarUrl: user.avatarUrl,
    status: user.status,
    isEmailVerified: user.isEmailVerified,
    mustChangePassword: user.mustChangePassword,
    dateOfBirth: user.dateOfBirth,
    dateOfJoining: user.dateOfJoining,
    timezone: user.timezone,
    locale: user.locale,
    notes: user.notes,
    lastLoginAt: user.lastLoginAt,
    lastLoginIp: user.lastLoginIp,
    role: user.role || null,
    department: user.department || null,
    reportsTo: user.reportsTo
      ? {
          id: user.reportsTo.id,
          fullName: fullName(user.reportsTo),
          email: user.reportsTo.email
        }
      : null,
    directReportCount: user._count ? user._count.directReports : undefined,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

module.exports = { shape, fullName };
