/*
  Central status -> semantic variant map. Every status chip in the app resolves
  through here so, e.g., "CONFIRMED" is the same blue everywhere. Variants map
  to StatusBadge styles: success / warning / info / destructive / neutral / draft.
*/
const MAP = {
  // generic lifecycle
  ACTIVE: 'success', APPROVED: 'success', PASSED: 'success', COMPLETED: 'success',
  PAID: 'success', DELIVERED: 'success', FULFILLED: 'success', ACCEPTED: 'success',
  DISPATCHED: 'info', CONFIRMED: 'info', ISSUED: 'info', PROCESSING: 'info',
  IN_PROGRESS: 'info', SENT: 'info', RUNNING: 'info', PICKING: 'info', PICKED: 'info', PACKED: 'info',
  PENDING: 'warning', ON_HOLD: 'warning', PARTIAL: 'warning', PARTIALLY_PAID: 'warning',
  PARTIALLY_FULFILLED: 'warning', OVERDUE: 'warning', QUEUED: 'warning', SUBMITTED: 'warning',
  REJECTED: 'destructive', FAILED: 'destructive', CANCELLED: 'destructive', BLACKLISTED: 'destructive',
  DRAFT: 'draft', QUOTED: 'draft',
  INACTIVE: 'neutral', CLOSED: 'neutral', EXPIRED: 'neutral', CONVERTED: 'neutral'
};

export function statusVariant(status) {
  if (!status) return 'neutral';
  return MAP[String(status).toUpperCase()] || 'neutral';
}
