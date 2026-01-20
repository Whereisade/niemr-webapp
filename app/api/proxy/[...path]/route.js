import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BACKEND = process.env.NIEMR_BACKEND_URL || "http://localhost:8000";
const ACCESS_COOKIE = process.env.ACCESS_COOKIE || "niemr_access";
const REFRESH_COOKIE = process.env.REFRESH_COOKIE || "niemr_refresh";

function withTrailingSlash(p) {
  return p.endsWith("/") ? p : p + "/";
}

function abortable(ms = 30000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return { controller, t };
}

async function forward(req, access) {
  const url = new URL(req.url);
  const rawPath = url.pathname.replace(/^\/api\/proxy/, "/api");
  const path = withTrailingSlash(rawPath);
  const target = `${BACKEND}${path}${url.search}`;

  const headers = {};
  req.headers.forEach((v, k) => {
    // Don't forward hop-by-hop / problematic headers
    if (/^host$|^cookie$|^content-length$|^connection$/i.test(k)) return;
    if (/^accept-encoding$/i.test(k)) return; // avoid gzip/encoding mismatches
    headers[k] = v;
  });

  // ensure upstream replies uncompressed, prevents header/body mismatch
  headers["accept-encoding"] = "identity";

  if (access) headers.Authorization = `Bearer ${access}`;

  const { controller, t } = abortable(30000);
  try {
    return await fetch(target, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.arrayBuffer(),
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

async function pipeBuffered(r) {
  // ✅ critical change: buffer upstream response (no streaming)
  const buf = await r.arrayBuffer();

  const res = new NextResponse(buf, { status: r.status });

  r.headers.forEach((v, k) => {
    // avoid hop-by-hop headers; content-length can be rederived
    if (/^transfer-encoding$|^connection$/i.test(k)) return;
    if (/^content-length$/i.test(k)) return;
    res.headers.set(k, v);
  });

  return res;
}

async function handler(req) {
  const access = req.cookies.get(ACCESS_COOKIE)?.value || null;

  let r = await forward(req, access);
  if (r.status !== 401) return pipeBuffered(r);

  const refresh = req.cookies.get(REFRESH_COOKIE)?.value || null;
  if (!refresh) return pipeBuffered(r);

  // Refresh directly against Django so we can reuse the new access token immediately
  const { controller, t } = abortable(20000);
  let rr;
  try {
    rr = await fetch(`${BACKEND}/api/accounts/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "accept-encoding": "identity" },
      body: JSON.stringify({ refresh }),
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }

  if (!rr.ok) return pipeBuffered(r);

  const refreshed = await rr.json().catch(() => ({}));
  const newAccess = refreshed?.access || null;
  if (!newAccess) return pipeBuffered(r);

  const retry = await forward(req, newAccess);
  const res = await pipeBuffered(retry);

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

export async function GET(req) { return handler(req); }
export async function POST(req) { return handler(req); }
export async function PUT(req) { return handler(req); }
export async function PATCH(req) { return handler(req); }
export async function DELETE(req) { return handler(req); }

