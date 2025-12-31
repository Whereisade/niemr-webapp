// app/api/bff/encounters/route.js - PATCHED VERSION
// ✅ Clean pass-through to Django API
// Works for both facility-based and independent provider encounters
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND = process.env.NIEMR_BACKEND_URL || "http://localhost:8000";
const ACCESS_COOKIE = process.env.ACCESS_COOKIE || "niemr_access";

function withTrailingSlash(p) {
  return p.endsWith("/") ? p : p + "/";
}

export async function GET(req) {
  try {
    // 1) Read JWT from HTTP-only cookie (must await cookies() in your Next version)
    const cookieStore = await cookies();
    const accessCookie = cookieStore.get(ACCESS_COOKIE);
    const access = accessCookie?.value || null;

    // 2) Build backend URL: http://localhost:8000/api/encounters/?page=...&status=...
    const incomingUrl = new URL(req.url);
    const search = incomingUrl.search || ""; // already includes leading "?" if present
    const path = withTrailingSlash("/api/encounters");
    const target = `${BACKEND}${path}${search}`;

    // 3) Prepare headers for the backend call
    const headers = new Headers();
    headers.set("Accept", "application/json");

    // Attach JWT if we have it
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

    // 5) ✅ PATCHED: Clean response without debug fields
    // Pass through Django response exactly as-is
    // This ensures both facility and independent provider encounters work identically
    return NextResponse.json(
      typeof payload === "object" && payload !== null
        ? payload
        : { detail: String(payload) },
      { status: backendRes.status }
    );
  } catch (err) {
    // If the BFF itself crashes, surface that clearly
    return NextResponse.json(
      {
        detail: `BFF error while calling encounters: ${
          err?.message || String(err)
        }`,
      },
      { status: 500 }
    );
  }
}