// lib/audit.js
import { apiFetch } from "@/lib/api";

/**
 * Fetch audit logs.
 *
 * Assumes backend exposes something like:
 *   GET /audit/logs/?page=&limit=&q=
 *
 * If your backend uses /audit/ or different params, we only need to
 * tweak the path and/or query building here later.
 */
export async function fetchAuditLogs({ page = 1, limit = 20, q = "" } = {}) {
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  if (q) {
    qs.set("q", q);
  }

  return apiFetch(`/audit/logs/?${qs.toString()}`);
}
