import { NextResponse } from "next/server";

const PROTECTED = [
  { prefix: "/dashboard/provider", roles: ["PROVIDER"] },
  { prefix: "/dashboard/facility", roles: ["ADMIN","SUPER_ADMIN","FRONTDESK","DOCTOR","NURSE","LAB","PHARMACY"] },
  { prefix: "/dashboard/patient", roles: ["PATIENT"] },
];

export function middleware(req) {
  const url = req.nextUrl;
  const cookies = req.cookies;
  const at = cookies.get("niemr_at");
  const role = cookies.get("niemr_role")?.value; // set this after login/registration

  // Public paths
  if (url.pathname.startsWith("/auth") || url.pathname.startsWith("/register")) {
    return NextResponse.next();
  }

  
  if (url.pathname.startsWith("/dashboard")) {
    if (!at) return NextResponse.redirect(new URL("/auth/login", url));
    const rule = PROTECTED.find(r => url.pathname.startsWith(r.prefix));
    if (rule && !rule.roles.includes(role)) return NextResponse.redirect(new URL("/403", url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*", "/register/:path*"],
};
