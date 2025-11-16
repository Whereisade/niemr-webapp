// app/api/bff/lab-orders/route.js
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

    // 2) Build backend URL: http://localhost:8000/api/labs/orders/?...
    const incomingUrl = new URL(req.url);
    const search = incomingUrl.search || ""; // includes leading "?" if present
    const path = withTrailingSlash("/api/labs/orders");
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

    // 5) Respond with JSON + debug info
    return NextResponse.json(
      {
        ...(typeof payload === "object" && payload !== null
          ? payload
          : { detail: String(payload) }),
        _debug_status_from_backend: backendRes.status,
        _debug_had_access_token: Boolean(access),
        _debug_auth_header_sent: headers.get("Authorization") || null,
        _debug_backend_url: target,
      },
      { status: backendRes.status }
    );
  } catch (err) {
    return NextResponse.json(
      {
        detail: `BFF error while calling lab orders: ${
          err?.message || String(err)
        }`,
      },
      { status: 500 }
    );
  }
}
