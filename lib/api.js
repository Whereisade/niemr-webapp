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

  // Check if body is FormData to avoid setting Content-Type
  const isFormData = typeof window !== "undefined" && init.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(init.headers || {}),
  };

  // Client-side timeout guard to prevent “Submitting…” forever.
  const timeoutMs = init.timeoutMs ?? 30000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const r = await fetch(url, {
      ...init,
      headers,
      credentials: "include",
      signal: init.signal ?? controller.signal,
    });

    const ct = r.headers.get("content-type") || "";
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
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error("Request timed out. Please retry (backend may be starting up).");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
