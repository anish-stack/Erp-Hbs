import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/quotation/download",
  "/register",
];

function isPublicRoute(pathname) {
  return PUBLIC_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Static / Next.js internal files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }


  // Public routes → authentication required nahi
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Refresh token cookie
  const refreshToken =
    request.cookies.get("erp_refresh_token")?.value;

  // No authentication → login
  if (!refreshToken) {
    const loginUrl = new URL("/login", request.url);

    loginUrl.searchParams.set("redirect", pathname);

    return NextResponse.redirect(loginUrl);
  }

  // Authenticated → continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};