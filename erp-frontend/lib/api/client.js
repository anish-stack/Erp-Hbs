'use client';

import axios from 'axios';
import Cookies from 'js-cookie';

/*
  Single axios instance for the whole app. All REST goes through the ERP
  gateway at /api/v1.

  Tokens are stored in COOKIES (not localStorage) via js-cookie. Why cookies:
  - Next.js middleware (middleware.js) can read them on the server and guard
    routes before a page even renders — localStorage is invisible to the server.
  - They're sent with a consistent, controllable lifetime (expiry) and
    sameSite/secure flags.
  Note: because the tokens arrive in the login RESPONSE BODY (not as Set-Cookie
  from the server), these are JS-readable cookies — not httpOnly. Fully
  httpOnly tokens would require a server-side proxy/BFF, which this SPA doesn't
  have. This is the standard trade-off for a token-in-body SPA.
*/

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

export const TOKEN_KEYS = { access: 'erp_access_token', refresh: 'erp_refresh_token' };

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTS = { sameSite: 'lax', secure: isProd, path: '/' };

export function getAccessToken() {
  // pehle localStorage se try karo
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEYS.access) || Cookies.get(TOKEN_KEYS.access) || null;
  }
  return Cookies.get(TOKEN_KEYS.access) || null;
}


export function getRefreshToken() {
  return Cookies.get(TOKEN_KEYS.refresh) || null;
}
export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) {
    // Access token too large for cookie → use localStorage
    localStorage.setItem(TOKEN_KEYS.access, accessToken);
  }

  if (refreshToken) {
    // Refresh token chhota hai → cookie me rakh sakte ho
    Cookies.set(TOKEN_KEYS.refresh, refreshToken, {
      ...COOKIE_OPTS,
      expires: 7,
    });
  }
}
export function clearTokens() {
  Cookies.remove(TOKEN_KEYS.access, { path: '/' });
  Cookies.remove(TOKEN_KEYS.refresh, { path: '/' });
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEYS.access);
  }
}

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  console.log("Befor Toke",token)
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // Attempt a single silent refresh on 401, then replay the original request.
    if (status === 401 && original && !original._retry && getRefreshToken()) {
      original._retry = true;
      try {
        refreshing =
          refreshing ||
          axios.post(`${API_BASE}/api/v1/auth/refresh`, { refreshToken: getRefreshToken() });
        const { data } = await refreshing;
        refreshing = null;
        const payload = data?.data || data;
        setTokens({ accessToken: payload.accessToken, refreshToken: payload.refreshToken });
        original.headers.Authorization = `Bearer ${payload.accessToken}`;
        return api(original);
      } catch (refreshErr) {
        refreshing = null;
        clearTokens();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

/** Normalise the backend envelope { success, message, data, meta }. */
export function unwrap(response) {
  return response?.data?.data ?? null;
}
export function unwrapList(response) {
  const body = response?.data;
  return {
    items: body?.data ?? [],
    pagination: body?.meta?.pagination ?? { total: 0, page: 1, limit: 20, totalPages: 0 }
  };
}
/** Pull a human-readable message out of any axios error. */
export function apiError(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    'Something went wrong. Please try again.'
  );
}
