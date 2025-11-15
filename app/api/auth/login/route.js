import { NextResponse } from "next/server";

const BACKEND = process.env.NIEMR_BACKEND_URL || "http://localhost:8000";
const ACCESS_COOKIE = process.env.ACCESS_COOKIE || "niemr_access";
const REFRESH_COOKIE = process.env.REFRESH_COOKIE || "niemr_refresh";

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: false, // set true when you’re on HTTPS
};

function pickTokens(data = {}) {
  // accept many possible shapes
  const nested = (obj, ...keys) =>
    keys.reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj);

  const access =
    data.access ??
    data.access_token ??
    data.token ??
    data.jwt ??
    nested(data, "tokens", "access") ??
    nested(data, "tokens", "access_token") ??
    nested(data, "data", "access") ??
    nested(data, "data", "access_token");

  const refresh =
    data.refresh ??
    data.refresh_token ??
    nested(data, "tokens", "refresh") ??
    nested(data, "tokens", "refresh_token") ??
    nested(data, "data", "refresh") ??
    nested(data, "data", "refresh_token");

  return { access, refresh };
}

export async function POST(req) {
  try {
    const payload = await req.json(); // { email, password, role } etc.
    const r = await fetch(`${BACKEND}/api/accounts/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // if backend returns non-JSON (e.g., 500 html), guard it:
    let data = null;
    try {
      data = await r.json();
    } catch {
      data = null;
    }

    if (!r.ok) {
      return NextResponse.json(data || { detail: "Login failed" }, { status: r.status });
    }

    const { access, refresh } = pickTokens(data || {});
    if (!access && !refresh) {
      // surface backend payload to help debug exact keys
      return NextResponse.json(
        {
          detail: "Backend did not include recognizable JWT fields.",
          received_keys: data ? Object.keys(data) : [],
        },
        { status: 500 }
      );
    }

    const res = NextResponse.json({
      ok: true,
      // return minimal info for the client if you want
      has_access: Boolean(access),
      has_refresh: Boolean(refresh),
    });

    if (access) res.cookies.set(ACCESS_COOKIE, access, cookieOpts);
    if (refresh) res.cookies.set(REFRESH_COOKIE, refresh, cookieOpts);

    return res;
  } catch (e) {
    return NextResponse.json({ detail: String(e) }, { status: 500 });
  }
}
