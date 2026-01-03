import { NextResponse } from "next/server";

const BACKEND = process.env.NIEMR_BACKEND_URL || "http://localhost:8000";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const uid = (body?.uid || "").toString().trim();
    const token = (body?.token || "").toString().trim();
    const new_password = (body?.new_password || "").toString();

    if (!uid || !token) {
      return NextResponse.json({ detail: "Missing reset link parameters" }, { status: 400 });
    }
    if (!new_password || new_password.length < 8) {
      return NextResponse.json({ detail: "Password must be at least 8 characters" }, { status: 400 });
    }

    const r = await fetch(`${BACKEND.replace(/\/+$/, "")}/api/accounts/password/reset/confirm/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, token, new_password }),
    });

    const ct = r.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await r.json().catch(() => ({}));
      return NextResponse.json(data, { status: r.status });
    }
    const text = await r.text().catch(() => "");
    return NextResponse.json({ detail: text || "OK" }, { status: r.status });
  } catch (e) {
    return NextResponse.json({ detail: e?.message || "Request failed" }, { status: 500 });
  }
}
