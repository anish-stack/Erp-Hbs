'use strict';
const { NOTIFICATION_CATEGORY, NOTIFICATION_PRIORITY, DELIVERY_CHANNEL } = require('../constants');

const N = NOTIFICATION_CATEGORY;
const P = NOTIFICATION_PRIORITY;
const C = DELIVERY_CHANNEL;

/**
 * Maps a domain event name to a notification template. Falls back to a
 * generic system notice for anything not explicitly mapped, so an unknown
 * event still surfaces something rather than being silently dropped.
 */
function resolve(event, data) {
  const d = data || {};

  const table = {
    'sales.order.confirmed': { category: N.SALES, priority: P.NORMAL, title: 'Sales order confirmed', message: `Order ${d.code || d.orderId} confirmed for ${d.customerId || 'customer'}.`, channels: [C.IN_APP] },
    'sales.order.cancelled': { category: N.SALES, priority: P.HIGH, title: 'Sales order cancelled', message: `Order ${d.code || d.orderId} was cancelled: ${d.reason || 'no reason given'}.`, channels: [C.IN_APP, C.EMAIL] },
    'sales.order.reservation_shortfall': { category: N.SALES, priority: P.HIGH, title: 'Stock shortfall on order', message: `Order ${d.code} has a reservation shortfall on ${(d.shortfalls || []).length} line(s).`, channels: [C.IN_APP] },
    'sales.quotation.sent': { category: N.SALES, priority: P.LOW, title: 'Quotation sent', message: `Quotation ${d.code} sent to customer.`, channels: [C.IN_APP] },

    'purchase.order.approved': { category: N.PURCHASE, priority: P.NORMAL, title: 'Purchase order approved', message: `PO ${d.code || d.poId} approved.`, channels: [C.IN_APP] },
    'purchase.order.overdue': { category: N.PURCHASE, priority: P.HIGH, title: 'Purchase order overdue', message: `PO ${d.code || d.poId} is overdue for delivery.`, channels: [C.IN_APP, C.EMAIL] },
    'purchase.grn.completed': { category: N.PURCHASE, priority: P.NORMAL, title: 'GRN completed', message: `GRN ${d.code || d.grnId} completed for PO ${d.poId}.`, channels: [C.IN_APP] },

    'quality.inspection.failed': { category: N.QUALITY, priority: P.HIGH, title: 'Inspection failed', message: `Inspection ${d.code || d.inspectionId} failed for part ${d.partId}.`, channels: [C.IN_APP, C.EMAIL] },
    'quality.inspection.partial': { category: N.QUALITY, priority: P.NORMAL, title: 'Inspection partially accepted', message: `Inspection ${d.code || d.inspectionId} partially accepted.`, channels: [C.IN_APP] },

    'inventory.stock.low': { category: N.INVENTORY, priority: P.NORMAL, title: 'Low stock alert', message: `Part ${d.partId} is below reorder point at warehouse ${d.warehouseId || ''}.`, channels: [C.IN_APP] },
    'inventory.stock.out': { category: N.INVENTORY, priority: P.CRITICAL, title: 'Stock out', message: `Part ${d.partId} is out of stock at warehouse ${d.warehouseId || ''}.`, channels: [C.IN_APP, C.EMAIL] },
    'inventory.lot.expiring': { category: N.INVENTORY, priority: P.HIGH, title: 'Lot expiring soon', message: `Lot ${d.lotNumber || d.lotId} is nearing expiry.`, channels: [C.IN_APP] },

    'finance.invoice.overdue': { category: N.FINANCE, priority: P.HIGH, title: 'Invoice overdue', message: `Invoice ${d.code} for ${d.partyId} is overdue (due ${d.amountDue}).`, channels: [C.IN_APP, C.EMAIL] },
    'finance.invoice.paid': { category: N.FINANCE, priority: P.LOW, title: 'Invoice paid', message: `Invoice ${d.code} fully paid.`, channels: [C.IN_APP] },
    'finance.payment.recorded': { category: N.FINANCE, priority: P.LOW, title: 'Payment recorded', message: `Payment ${d.code} of ${d.amount} recorded (${d.method}).`, channels: [C.IN_APP] },

    'shipment.dispatched': { category: N.SHIPMENT, priority: P.NORMAL, title: 'Shipment dispatched', message: `Shipment ${d.code} for order ${d.orderCode} dispatched${d.trackingNumber ? ` (tracking ${d.trackingNumber})` : ''}.`, channels: [C.IN_APP, C.EMAIL] },
    'shipment.delivered': { category: N.SHIPMENT, priority: P.NORMAL, title: 'Shipment delivered', message: `Shipment ${d.code} delivered.`, channels: [C.IN_APP] },
    'shipment.cancelled': { category: N.SHIPMENT, priority: P.HIGH, title: 'Shipment cancelled', message: `Shipment ${d.code} cancelled: ${d.reason || 'no reason given'}.`, channels: [C.IN_APP] },

    'warehouse.bin.blocked': { category: N.INVENTORY, priority: P.NORMAL, title: 'Bin blocked', message: `Bin ${d.code} blocked: ${d.reason || ''}.`, channels: [C.IN_APP] },
    'warehouse.task.assigned': { category: N.INVENTORY, priority: P.LOW, title: 'Task assigned', message: `${d.type || 'Task'} ${d.code || d.taskId} assigned to you.`, channels: [C.IN_APP] },

    'report.completed': { category: N.SYSTEM, priority: P.LOW, title: 'Report ready', message: `Your report "${d.reportName || d.reportKey}" is ready (${d.rowCount || 0} rows).`, channels: [C.IN_APP] },
    'report.failed': { category: N.SYSTEM, priority: P.NORMAL, title: 'Report failed', message: `Your report "${d.reportName || d.reportKey}" failed: ${d.error || 'unknown error'}.`, channels: [C.IN_APP] }
  };

  return table[event] || {
    category: N.SYSTEM,
    priority: P.LOW,
    title: event,
    message: `Event received: ${event}`,
    channels: [C.IN_APP]
  };
}

module.exports = { resolve };
