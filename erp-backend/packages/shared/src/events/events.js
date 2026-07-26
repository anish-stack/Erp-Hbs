'use strict';

/** Canonical RabbitMQ routing keys. Service-to-service events only. */
module.exports = {
  AUTH: {
    USER_REGISTERED: 'auth.user.registered',
    USER_LOGGED_IN: 'auth.user.logged_in',
    PASSWORD_CHANGED: 'auth.user.password_changed',
    TOKEN_REVOKED: 'auth.token.revoked'
  },
  USER: {
    CREATED: 'user.created',
    UPDATED: 'user.updated',
    DELETED: 'user.deleted',
    STATUS_CHANGED: 'user.status_changed'
  },
  ROLE: {
    CREATED: 'role.created',
    UPDATED: 'role.updated',
    DELETED: 'role.deleted',
    PERMISSIONS_CHANGED: 'role.permissions_changed'
  },
  SUPPLIER: {
    CREATED: 'supplier.created',
    UPDATED: 'supplier.updated',
    APPROVED: 'supplier.approved',
    BLACKLISTED: 'supplier.blacklisted'
  },
  CRM: {
    LEAD_CREATED: 'crm.lead.created',
    LEAD_STAGE_CHANGED: 'crm.lead.stage_changed',
    CUSTOMER_CREATED: 'crm.customer.created'
  },
  RFQ: {
    CREATED: 'rfq.created',
    QUOTED: 'rfq.quoted',
    APPROVED: 'rfq.approved',
    REJECTED: 'rfq.rejected',
    CONVERTED: 'rfq.converted'
  },
  PURCHASE: {
    ORDER_CREATED: 'purchase.order.created',
    ORDER_APPROVED: 'purchase.order.approved',
    ORDER_CANCELLED: 'purchase.order.cancelled',
    GRN_CREATED: 'purchase.grn.created'
  },
  INVENTORY: {
    UPDATED: 'inventory.updated',
    STOCK_RESERVED: 'inventory.stock.reserved',
    STOCK_RELEASED: 'inventory.stock.released',
    LOW_STOCK: 'inventory.low_stock',
    ADJUSTED: 'inventory.adjusted'
  },
  WAREHOUSE: {
    BIN_ASSIGNED: 'warehouse.bin.assigned',
    TRANSFER_CREATED: 'warehouse.transfer.created',
    TRANSFER_COMPLETED: 'warehouse.transfer.completed'
  },
  QUALITY: {
    INSPECTION_CREATED: 'quality.inspection.created',
    INSPECTION_PASSED: 'quality.inspection.passed',
    INSPECTION_FAILED: 'quality.inspection.failed'
  },
  SALES: {
    ORDER_CREATED: 'sales.order.created',
    ORDER_APPROVED: 'sales.order.approved',
    ORDER_CANCELLED: 'sales.order.cancelled',
    INVOICE_REQUESTED: 'sales.invoice.requested'
  },
  SHIPMENT: {
    CREATED: 'shipment.created',
    DISPATCHED: 'shipment.dispatched',
    IN_TRANSIT: 'shipment.in_transit',
    DELIVERED: 'shipment.delivered'
  },
  FINANCE: {
    INVOICE_GENERATED: 'finance.invoice.generated',
    PAYMENT_RECEIVED: 'finance.payment.received',
    PAYMENT_FAILED: 'finance.payment.failed',
    CREDIT_LIMIT_BREACHED: 'finance.credit_limit.breached'
  },
  FILE: {
    UPLOADED: 'file.uploaded',
    DELETED: 'file.deleted'
  },
  NOTIFICATION: {
    DISPATCH: 'notification.dispatch',
    EMAIL: 'notification.email'
  },
  AUDIT: {
    LOG: 'audit.log'
  }
};
