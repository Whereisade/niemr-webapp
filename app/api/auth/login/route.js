import { NextResponse } from "next/server";

const BACKEND = process.env.NIEMR_BACKEND_URL;
const ACCESS_COOKIE = process.env.ACCESS_COOKIE || "niemr_access";
const REFRESH_COOKIE = process.env.REFRESH_COOKIE || "niemr_refresh";

export async function POST(req) {
  const body = await req.json();
  const r = await fetch(`${BACKEND}/api/accounts/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await r.json();
  if (!r.ok) {
    return NextResponse.json(data, { status: r.status });
  }

  const res = NextResponse.json({ user: data.user ?? null }, { status: 200 });
  const secure = process.env.NODE_ENV === "production";
  const cookieBase = { httpOnly: true, sameSite: "lax", secure, path: "/" };

  if (data.access) res.cookies.set(ACCESS_COOKIE, data.access, { ...cookieBase, maxAge: 60 * 25 });
  if (data.refresh) res.cookies.set(REFRESH_COOKIE, data.refresh, { ...cookieBase, maxAge: 60 * 60 * 24 * 7 });

  return res;
}
