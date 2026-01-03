import { NextResponse } from "next/server";

const BACKEND = process.env.NIEMR_BACKEND_URL || "http://localhost:8000";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body?.email || "").toString().trim();
    if (!email) {
      return NextResponse.json({ detail: "Email is required" }, { status: 400 });
    }

    const r = await fetch(`${BACKEND.replace(/\/+$/, "")}/api/accounts/password/reset/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    // backend always returns 200 for security; still pass through body safely
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
