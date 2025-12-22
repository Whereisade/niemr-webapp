import { NextResponse } from "next/server";

const BACKEND = process.env.NIEMR_BACKEND_URL || "http://localhost:8000";
const ACCESS_COOKIE = process.env.ACCESS_COOKIE || "niemr_access";

export async function POST(req) {
  const refresh = req.headers.get("x-refresh-token") || "";
  if (!refresh) return NextResponse.json({ detail: "Missing refresh" }, { status: 401 });

  const r = await fetch(`${BACKEND}/api/accounts/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  const data = await r.json();
  if (!r.ok) return NextResponse.json(data, { status: r.status });

  const res = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(ACCESS_COOKIE, data.access, {
    httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 60 * 25,
  });
  return res;
}
