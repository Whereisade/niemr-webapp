// Frontend/middleware.js
import { NextResponse } from "next/server";

const ACCESS_COOKIE = process.env.ACCESS_COOKIE || "niemr_access";

const PROTECTED = [
  { prefix: "/provider", login: "/login/provider" },
  { prefix: "/facility", login: "/login/facility" },
  { prefix: "/patient",  login: "/login/patient" },
];

export function proxy(req) {
  const url = req.nextUrl;

  // Public routes
  if (
    url.pathname === "/" ||
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/register") ||
    url.pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  const cookies = req.cookies;
  const accessToken = cookies.get(ACCESS_COOKIE)?.value || null;

  const rule = PROTECTED.find((r) => url.pathname.startsWith(r.prefix));

  // If route is protected and there's no access token, send user to the right login page
  if (rule && !accessToken) {
    return NextResponse.redirect(new URL(rule.login, url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/provider/:path*",
    "/facility/:path*",
    "/patient/:path*",
    "/login/:path*",
    "/register/:path*",
  ],
};
