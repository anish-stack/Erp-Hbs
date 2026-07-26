import { NextResponse } from 'next/server';

/*
  Access token ab localStorage me hai (size limit ki wajah se).
  Middleware sirf refresh token check karega (jo cookie me hai).

  - Refresh token nahi + protected route  → /login
  - Refresh token hai + /login            → /dashboard
  Full auth check client-side AuthProvider karega.
*/

const PUBLIC_PATHS = ['/login'];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Ab refresh token check karenge (cookie me hai)
  const refreshToken = request.cookies.get('erp_refresh_token')?.value;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

  // No refresh token + protected route → login
  if (!refreshToken && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    if (pathname !== '/') {
      url.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(url);
  }

  // Has refresh token + visiting login → dashboard
  if (refreshToken && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|gateway|.*\\..*).*)'],
};