'use client';

import { useCan } from '@/lib/auth/use-permissions';

/*
  Conditionally renders children only if the user holds the permission(s).
  Use for buttons/sections. Route-level guards live in the (app) layout.
    <Protected permission="sales.create"><Button>New order</Button></Protected>
    <Protected anyOf={['finance.approve','finance.update']}>…</Protected>
*/
export function Protected({ permission, anyOf, allOf, fallback = null, children }) {
  const { can, canAny, canAll } = useCan();
  let allowed = true;
  if (permission) allowed = can(permission);
  else if (anyOf) allowed = canAny(anyOf);
  else if (allOf) allowed = canAll(allOf);
  return allowed ? children : fallback;
}
