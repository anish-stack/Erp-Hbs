'use strict';

const { ApiError } = require('@erp/shared');
const config = require('../config');
const { call } = require('./master.client');

class SupplierClient {
  static async getSupplier(supplierId, user) {
    return call(config.internal.supplierServiceUrl, `${config.basePath}/suppliers/${supplierId}`, { user });
  }

  /** Only APPROVED, transactable suppliers may be invited to an RFQ. */
  static async verifySuppliers(supplierIds, user) {
    const unique = [...new Set(supplierIds)];
    const results = await Promise.allSettled(unique.map((id) => SupplierClient.getSupplier(id, user)));

    const resolved = [];
    const missing = [];
    const notApproved = [];

    unique.forEach((id, index) => {
      const result = results[index];
      if (result.status === 'rejected') return missing.push(id);
      if (result.value.status !== 'APPROVED') return notApproved.push({ id, status: result.value.status });
      resolved.push(result.value);
    });

    return { resolved, missing, notApproved };
  }

  static async healthy() {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`${config.internal.supplierServiceUrl}/health/live`, { signal: controller.signal });
      clearTimeout(timer);
      return response.ok;
    } catch (err) {
      return false;
    }
  }
}

module.exports = SupplierClient;
