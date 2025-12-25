import { NextResponse } from "next/server";

const BACKEND = (process.env.NIEMR_BACKEND_URL || "http://localhost:8000").replace(/\/+$/, "");
const ACCESS_COOKIE = process.env.ACCESS_COOKIE || "niemr_access";
const REFRESH_COOKIE = process.env.REFRESH_COOKIE || "niemr_refresh";

function safeCopyHeaders(from, to) {
  from.forEach((v, k) => {
    // These can break binary streaming / duplicate encoding.
    if (!/^content-encoding$|^transfer-encoding$|^connection$/i.test(k)) {
      to.set(k, v);
    }
  });
}

async function callBackend({ bodyBuf, contentType, access }) {
  const headers = new Headers();
  headers.set("Accept", "*/*");
  if (contentType) headers.set("Content-Type", contentType);
  if (access) headers.set("Authorization", `Bearer ${access}`);

  return fetch(`${BACKEND}/api/reports/generate/`, {
    method: "POST",
    headers,
    body: bodyBuf,
  });
}

async function refreshAccess(refreshToken) {
  const rr = await fetch(`${BACKEND}/api/accounts/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });
  if (!rr.ok) return null;
  const data = await rr.json().catch(() => ({}));
  return data?.access || null;
}

export async function POST(req) {
  // Read request cookies
  const access = req.cookies.get(ACCESS_COOKIE)?.value || null;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value || null;

  // Preserve raw body so we can retry after refresh
  const contentType = req.headers.get("content-type") || "application/json";
  const bodyBuf = await req.arrayBuffer();

  // 1) First try with current access
  let backendRes = await callBackend({ bodyBuf, contentType, access });

  // 2) Refresh & retry on 401
  let newAccess = null;
  if (backendRes.status === 401 && refresh) {
    newAccess = await refreshAccess(refresh);
    if (newAccess) {
      backendRes = await callBackend({ bodyBuf, contentType, access: newAccess });
    }
  }

  const outHeaders = new Headers();
  safeCopyHeaders(backendRes.headers, outHeaders);

  // Helpful header for debugging
  outHeaders.set(
    "X-NIEMR-Reports-Debug",
    JSON.stringify({
      status: backendRes.status,
      refreshed: Boolean(newAccess),
      backend_url: `${BACKEND}/api/reports/generate/`,
    })
  );

  const buf = await backendRes.arrayBuffer();
  const res = new NextResponse(buf, { status: backendRes.status, headers: outHeaders });

  if (newAccess) {
    const secure = process.env.NODE_ENV === "production";
    res.cookies.set(ACCESS_COOKIE, newAccess, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 25,
    });
  }

  return res;
}
