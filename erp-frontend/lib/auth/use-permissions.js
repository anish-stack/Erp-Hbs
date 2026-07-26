'use client';

import { useAuth } from './auth-context';

/*
  RBAC helper. Backend permissions are flat strings: "module.action"
  (e.g. "sales.create"). A user with "*.*" or "<module>.*" is a wildcard.
*/
export function useCan() {
  const { permissions } = useAuth();

  const can = (permission) => {
    if (!permission) return true;
    if (!permissions || permissions.length === 0) return false;
    if (permissions.includes('*.*')) return true;
    if (permissions.includes(permission)) return true;
    const moduleName = permission.split('.')[0];
    return permissions.includes(`${moduleName}.*`);
  };

  const canAny = (list = []) => list.some((p) => can(p));
  const canAll = (list = []) => list.every((p) => can(p));

  return { can, canAny, canAll };
}
