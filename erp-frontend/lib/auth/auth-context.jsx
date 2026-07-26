'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/services';
import { setTokens, clearTokens, getAccessToken } from '@/lib/api/client';
import Cookies from 'js-cookie';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    try {
      const [me, perms] = await Promise.all([authApi.me(), authApi.permissions()]);
      setUser(me);
      setPermissions(Array.isArray(perms) ? perms : perms?.permissions || []);
    } catch {
      clearTokens();
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    console.log("data?.tokens",data?.tokens)
    setTokens({ accessToken: data?.tokens?.accessToken, refreshToken: data?.tokens?.refreshToken });
    

console.log("Cookie after set", Cookies.get("erp_access_token"));
    const perms = await authApi.permissions().catch(() => []);
    console.log(perms)
    setUser(data.user || (await authApi.me()));
    setPermissions(Array.isArray(perms) ? perms : perms?.permissions || []);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    clearTokens();
    setUser(null);
    setPermissions([]);
    router.replace('/login');
  }, [router]);

  const value = {
    user,
    permissions,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refresh: loadSession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
