import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NIEMR_BACKEND_URL;
const ACCESS_COOKIE = process.env.ACCESS_COOKIE || "niemr_access";
const REFRESH_COOKIE = process.env.REFRESH_COOKIE || "niemr_refresh";

async function forward(req, access) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/proxy/, "/api");
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

  // Try one refresh
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value || null;
  if (!refresh) return pipe(r);

  const refreshRes = await fetch(new URL("/api/auth/refresh", req.url), {
    method: "POST",
    headers: { "x-refresh-token": refresh },
  });
  if (!refreshRes.ok) return pipe(r);

  // Retry after refresh (cookie updated by refresh route)
  const retry = await forward(req, req.cookies.get(ACCESS_COOKIE)?.value || null);
  return pipe(retry);
}
