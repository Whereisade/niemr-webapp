// app/api/bff/charges/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND = process.env.NIEMR_BACKEND_URL || "http://localhost:8000";
const ACCESS_COOKIE = process.env.ACCESS_COOKIE || "niemr_access";

function withTrailingSlash(p) {
  return p.endsWith("/") ? p : p + "/";
}

export async function GET(req) {
  try {
    // 1) Read JWT from HTTP-only cookie
    const cookieStore = await cookies();
    const accessCookie = cookieStore.get(ACCESS_COOKIE);
    const access = accessCookie?.value || null;

    // 2) Build backend URL: http://localhost:8000/api/billing/charges/?...
    const incomingUrl = new URL(req.url);
    const search = incomingUrl.search || ""; // includes leading "?" if present
    const path = withTrailingSlash("/api/billing/charges");
    const target = `${BACKEND}${path}${search}`;

    // 3) Prepare headers
    const headers = new Headers();
    headers.set("Accept", "application/json");
    if (access) {
      headers.set("Authorization", `Bearer ${access}`);
    }

    // 4) Call Django backend
    const backendRes = await fetch(target, {
      method: "GET",
      headers,
    });

    const contentType = backendRes.headers.get("content-type") || "";
    const text = await backendRes.text();

    let payload;
    if (contentType.includes("application/json")) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { detail: text };
      }
    } else {
      payload = { detail: text };
    }

    // 5) Respond with JSON (support arrays), move debug to headers
    const body =
      typeof payload === "object" && payload !== null
        ? payload
        : { detail: String(payload) };
    const res = NextResponse.json(body, { status: backendRes.status });
    res.headers.set("x-bff-backend-status", String(backendRes.status));
    res.headers.set("x-bff-had-access-token", access ? "1" : "0");
    res.headers.set("x-bff-backend-url", target);
    return res;
  } catch (err) {
    return NextResponse.json(
      {
        detail: `BFF error while calling charges: ${
          err?.message || String(err)
        }`,
      },
      { status: 500 }
    );
  }
}
