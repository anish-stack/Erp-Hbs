import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Currency — defaults to INR, the ERP's base currency. */
export function formatMoney(value, currency = 'INR') {
  const n = Number(value);
  if (value === null || value === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(n);
}

export function formatNumber(value, digits = 0) {
  const n = Number(value);
  if (value === null || value === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: digits }).format(n);
}

export function formatDate(value, pattern = 'dd MMM yyyy') {
  if (!value) return '—';
  const d = typeof value === 'string' ? parseISO(value) : value;
  return isValid(d) ? format(d, pattern) : '—';
}

export function formatDateTime(value) {
  return formatDate(value, 'dd MMM yyyy, HH:mm');
}

export function fromNow(value) {
  if (!value) return '—';
  const d = typeof value === 'string' ? parseISO(value) : value;
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '—';
}

/** Turn "sales-orders-register" or "PARTIALLY_FULFILLED" into "Partially fulfilled". */
export function humanize(value) {
  if (!value) return '';
  return String(value)
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function initials(name) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

/** Role can come from the API as a string ("admin") or an object
    ({ id, code, name, landingPath }). Always return a display string. */
export function roleLabel(role) {
  if (!role) return '';
  if (typeof role === 'string') return role;
  return role.name || role.code || '';
}