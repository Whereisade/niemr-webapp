function normalizePath(path) {
  
  const q = path.indexOf("?");
  if (q !== -1) {
    const base = path.slice(0, q);
    const qs = path.slice(q);
    return (base.endsWith("/") ? base : base + "/") + qs;
  }
  return path.endsWith("/") ? path : path + "/";
}

export async function apiFetch(path, init = {}) {
  const norm = normalizePath(path);
  const url = `/api/proxy${norm.startsWith("/") ? "" : "/"}${norm}`;
  const r = await fetch(url, { ...init, credentials: "include" });

  const ct = r.headers.get("content-type") || "";
  // Try to parse JSON only if server says it's JSON
  const isJSON = ct.includes("application/json");

  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const body = isJSON ? await r.json() : await r.text();
      msg = body?.detail || (typeof body === "string" ? body : JSON.stringify(body));
    } catch {
      // ignore parse errors; keep default msg
    }
    throw new Error(msg);
  }

  return isJSON ? r.json() : r;
}
