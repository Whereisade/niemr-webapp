import { NextResponse } from "next/server";

// Ensure this route runs on Node.js (not Edge) and has enough time for cold starts.
export const runtime = "nodejs";
export const maxDuration = 30; // seconds (plan-dependent on Vercel)
export const dynamic = "force-dynamic";

const RAW_BACKEND = process.env.NIEMR_BACKEND_URL || "http://localhost:8000";
const ACCESS_COOKIE = process.env.ACCESS_COOKIE || "niemr_access";
const REFRESH_COOKIE = process.env.REFRESH_COOKIE || "niemr_refresh";

const BACKEND = (() => {
  // Trim trailing slashes to avoid double-slash URLs
  let b = String(RAW_BACKEND || "").trim().replace(/\/+$/, "");

  // If someone accidentally set http://<service>.onrender.com in production,
  // follow-up redirects can leak to the browser and trigger CORS issues.
  // Force https for onrender.com hosts in production.
  try {
    const u = new URL(b);
    if (
      process.env.NODE_ENV === "production" &&
      u.protocol === "http:" &&
      /\.onrender\.com$/i.test(u.hostname)
    ) {
      b = b.replace(/^http:\/\//i, "https://");
    }
  } catch {
    // ignore
  }

  return b;
})();

const FETCH_TIMEOUT_MS = Number(process.env.PROXY_FETCH_TIMEOUT_MS || 25000);

function withTrailingSlash(p) {
  return p.endsWith("/") ? p : p + "/";
}

async function forward(req, access) {
  const url = new URL(req.url);
  const rawPath = url.pathname.replace(/^\/api\/proxy/, "/api");
  const path = withTrailingSlash(rawPath);
  const target = `${BACKEND}${path}${url.search}`;

  const headers = {};
  req.headers.forEach((v, k) => {
    if (!/^host$|^cookie$|^content-length$/i.test(k)) headers[k] = v;
  });
  if (access) headers.Authorization = `Bearer ${access}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(target, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.arrayBuffer(),
      // Follow redirects server-side (prevents browser CORS issues if backend redirects http->https)
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

function pipe(r) {
  const res = new NextResponse(r.body, { status: r.status });
  r.headers.forEach((v, k) => {
    if (!/^content-encoding$|^transfer-encoding$|^connection$/i.test(k)) res.headers.set(k, v);
  });
  return res;
}

export async function GET(req) {
  return handler(req);
}
export async function POST(req) {
  return handler(req);
}
export async function PUT(req) {
  return handler(req);
}
export async function PATCH(req) {
  return handler(req);
}
export async function DELETE(req) {
  return handler(req);
}

async function handler(req) {
  try {
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
      redirect: "follow",
      cache: "no-store",
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
  } catch (e) {
    const msg = e?.name === "AbortError"
      ? `Proxy timeout after ${FETCH_TIMEOUT_MS}ms. Backend may be cold-starting or unavailable.`
      : (e?.message || "Proxy error");

    return NextResponse.json({ detail: msg }, { status: 502 });
  }
}
