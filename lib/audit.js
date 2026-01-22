// lib/audit.js
import { apiFetch } from "@/lib/api";

/**
 * Fetch audit logs with pagination and filtering.
 *
 * Backend endpoint:
 *   GET /audit/logs/?page=&limit=&s=&verb=&model=&actor=&target_id=&start=&end=
 *
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 20)
 * @param {string} params.q - Search query (searches message, actor_email, target_id)
 * @param {string} params.verb - Filter by verb (CREATE, UPDATE, DELETE, M2M, LOGIN, LOGOUT, ACTION)
 * @param {string} params.model - Filter by target model name (e.g., "patient", "encounter")
 * @param {string} params.actor - Filter by actor user ID
 * @param {string} params.target_id - Filter by specific target object ID
 * @param {string} params.start - Filter by start date (ISO datetime)
 * @param {string} params.end - Filter by end date (ISO datetime)
 * @returns {Promise<{count: number, next: string|null, previous: string|null, results: Array}>}
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
  const params = new URLSearchParams();

  // Always include page and limit
  params.set("page", String(page));
  params.set("limit", String(limit));

  // Only add filters if they have values
  if (q) params.set("s", q);
  if (verb) params.set("verb", verb);
  if (model) params.set("model", model);
  if (actor) params.set("actor", actor);
  if (target_id) params.set("target_id", target_id);
  if (start) params.set("start", start);
  if (end) params.set("end", end);

  const response = await apiFetch(`/audit/logs/?${params.toString()}`);
  
  // Ensure response has the expected structure
  return {
    count: response?.count || 0,
    next: response?.next || null,
    previous: response?.previous || null,
    results: response?.results || [],
  };
}

/**
 * Fetch a single audit log by ID.
 * @param {string} id - Audit log UUID
 * @returns {Promise<Object>}
 */
export async function fetchAuditLogById(id) {
  if (!id) {
    throw new Error("Audit log ID is required");
  }
  return apiFetch(`/audit/logs/${id}/`);
}

/**
 * Get available verb choices for filtering.
 * @returns {Array<{value: string, label: string}>}
 */
export function getVerbChoices() {
  return [
    { value: "", label: "All Actions" },
    { value: "CREATE", label: "Created" },
    { value: "UPDATE", label: "Updated" },
    { value: "DELETE", label: "Deleted" },
    { value: "M2M", label: "Linked" },
    { value: "LOGIN", label: "Login" },
    { value: "LOGOUT", label: "Logout" },
    { value: "ACTION", label: "Custom Action" },
  ];
}