export async function apiFetch(path, init = {}) {
  const url = `/api/proxy${path.startsWith("/") ? "" : "/"}${path}`;
  const r = await fetch(url, { ...init, credentials: "include" });
  if (!r.ok) {
    const ct = r.headers.get("content-type") || "";
    const body = ct.includes("application/json") ? await r.json() : await r.text();
    const msg = body?.detail || (typeof body === "string" ? body : JSON.stringify(body));
    throw new Error(msg || `HTTP ${r.status}`);
  }
  const ct = r.headers.get("content-type") || "";
  return ct.includes("application/json") ? r.json() : r;
}
