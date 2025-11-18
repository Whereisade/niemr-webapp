import { cookies } from "next/headers";

const BACKEND = process.env.NIEMR_BACKEND_URL || "http://localhost:8000";
const ACCESS_COOKIE = process.env.ACCESS_COOKIE || "niemr_access";

function withTrailingSlash(path) {
  return path.endsWith("/") ? path : path + "/";
}

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const accessCookie = cookieStore.get(ACCESS_COOKIE);
    const access = accessCookie?.value || null;

    const body = await req.text(); // raw body (JSON from client)

    const headers = new Headers();
    headers.set("Accept", "*/*");

    // forward JSON content-type if present
    const incomingContentType = req.headers.get("content-type");
    if (incomingContentType) {
      headers.set("Content-Type", incomingContentType);
    }

    if (access) {
      headers.set("Authorization", `Bearer ${access}`);
    }

    const target = `${BACKEND}${withTrailingSlash("/api/reports/generate")}`.replace(
      /\/+$/,
      "/generate"
    );

    const backendRes = await fetch(target, {
      method: "POST",
      headers,
      body,
    });

    const arrayBuf = await backendRes.arrayBuffer();

    // clone headers from backend
    const outHeaders = new Headers();
    backendRes.headers.forEach((value, key) => {
      outHeaders.set(key, value);
    });

    // helpful for debugging if things go wrong
    outHeaders.set(
      "X-NIEMR-Reports-Debug",
      JSON.stringify({
        status: backendRes.status,
        backend_url: target,
        had_access: Boolean(access),
      })
    );

    return new Response(arrayBuf, {
      status: backendRes.status,
      headers: outHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        detail: `BFF error while calling reports/generate: ${
          err?.message || String(err)
        }`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
