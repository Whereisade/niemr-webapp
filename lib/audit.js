// lib/audit.js
import { apiFetch } from "@/lib/api";

/**
 * Fetch audit logs.
 *
 * Backend endpoint:
 *   GET /audit/logs/?page=&limit=&s=
 *
 * Filters supported:
 *   - page: pagination page number
 *   - limit: items per page
 *   - s: search (message, actor_email)
 *   - verb: CREATE, UPDATE, DELETE, M2M, LOGIN, LOGOUT, ACTION
 *   - model: target model name (e.g., "patient", "encounter")
 *   - actor: actor user ID
 *   - target_id: specific target object ID
 *   - start: ISO datetime for created_at >= start
 *   - end: ISO datetime for created_at <= end
 */
export async function fetchAuditLogs({
  page = 1,
  limit = 20,
  q = "",
  verb = "",
  model = "",
  actor = "",
  target_id = "",
  start = "",
  end = "",
} = {}) {
  const qs = new URLSearchParams();

  qs.set("page", String(page));
  qs.set("limit", String(limit));

  // Backend uses 's' for search, but we accept 'q' for convenience
  if (q) qs.set("s", q);
  if (verb) qs.set("verb", verb);
  if (model) qs.set("model", model);
  if (actor) qs.set("actor", actor);
  if (target_id) qs.set("target_id", target_id);
  if (start) qs.set("start", start);
  if (end) qs.set("end", end);

  return apiFetch(`/audit/logs/?${qs.toString()}`);
}

/**
 * Fetch a single audit log by ID.
 */
export async function fetchAuditLogById(id) {
  if (!id) throw new Error("Audit log ID is required");
  return apiFetch(`/audit/logs/${id}/`);
}