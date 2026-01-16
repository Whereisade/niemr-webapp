import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NIEMR_BACKEND_URL || "http://localhost:8000";
const ACCESS_COOKIE = process.env.ACCESS_COOKIE || "niemr_access";
const REFRESH_COOKIE = process.env.REFRESH_COOKIE || "niemr_refresh";

function withTrailingSlash(p) {
  return p.endsWith("/") ? p : p + "/";
}

async function forward(req, access) {
  const url = new URL(req.url);
  const rawPath = url.pathname.replace(/^\/api\/proxy/, "/api");
  const path = withTrailingSlash(rawPath);              // <- enforce slash here
  const target = `${BACKEND}${path}${url.search}`;

  const headers = {};
  req.headers.forEach((v, k) => {
    if (!/^host$|^cookie$|^content-length$/i.test(k)) headers[k] = v;
  });
  if (access) headers.Authorization = `Bearer ${access}`;

  return fetch(target, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.arrayBuffer(),
    redirect: "manual",
  });
}

function pipe(r) {
  const res = new NextResponse(r.body, { status: r.status });
  r.headers.forEach((v, k) => {
    if (!/^content-encoding$|^transfer-encoding$|^connection$/i.test(k)) res.headers.set(k, v);
  });
  return res;
}

export async function GET(req) { return handler(req); }
export async function POST(req) { return handler(req); }
export async function PUT(req) { return handler(req); }
export async function PATCH(req) { return handler(req); }
export async function DELETE(req) { return handler(req); }

async function handler(req) {
  const access = req.cookies.get(ACCESS_COOKIE)?.value || null;
  let r = await forward(req, access);
  if (r.status !== 401) return pipe(r);

  const refresh = req.cookies.get(REFRESH_COOKIE)?.value || null;
  if (!refresh) return pipe(r);

  // Refresh directly against Django so we can reuse the new access token immediately
  const rr = await fetch(`${BACKEND}/api/accounts/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!rr.ok) return pipe(r);

  const refreshed = await rr.json().catch(() => ({}));
  const newAccess = refreshed?.access || null;
  if (!newAccess) return pipe(r);

  const retry = await forward(req, newAccess);
  const res = pipe(retry);

  // Update cookie in the same response
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(ACCESS_COOKIE, newAccess, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 25,
  });
  return res;
}