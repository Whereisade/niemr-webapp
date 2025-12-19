// lib/encounterActions.js
import { apiFetch } from "@/lib/api";

/**
 * Create a new encounter.
 *
 * Backend:
 *   POST /encounters/
 *
 * Required (backend model):
 *   - patient (id)
 *   - occurred_at (ISO datetime)
 */
export async function createEncounter(payload = {}) {
  return apiFetch(`/encounters/`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

/**
 * Close an encounter.
 *
 * Backend:
 *   POST /encounters/{id}/close/
 */
export async function closeEncounter(encounterId) {
  if (!encounterId) throw new Error("encounterId is required");

  return apiFetch(`/encounters/${encounterId}/close/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * Cross out an encounter.
 *
 * Backend:
 *   POST /encounters/{id}/cross_out/
 */
export async function crossOutEncounter(encounterId) {
  if (!encounterId) throw new Error("encounterId is required");

  // Deprecated: the product now uses per-section corrections after lock.
  // Kept for backward compatibility with old UIs (backend returns 400).

  return apiFetch(`/encounters/${encounterId}/cross_out/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * Amend encounter.
 *
 * Backend:
 *   POST /encounters/{id}/amend/
 */
export async function amendEncounter(encounterId, payload = {}) {
  if (!encounterId) throw new Error("encounterId is required");

  return addEncounterAmendment(encounterId, payload);
}

/**
 * Pause an encounter (typically when waiting on lab results).
 *
 * Backend:
 *   POST /encounters/{id}/pause/
 */
export async function pauseEncounter(encounterId, payload = {}) {
  if (!encounterId) throw new Error("encounterId is required");

  return apiFetch(`/encounters/${encounterId}/pause/`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

/**
 * Resume a paused encounter.
 *
 * Backend:
 *   POST /encounters/{id}/resume/
 */
export async function resumeEncounter(encounterId, payload = {}) {
  if (!encounterId) throw new Error("encounterId is required");

  return apiFetch(`/encounters/${encounterId}/resume/`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

/**
 * Finalize SOAP note + diagnosis section (starts the 24h lock window).
 *
 * Backend:
 *   POST /encounters/{id}/finalize_note/
 */
export async function finalizeEncounterNote(encounterId) {
  if (!encounterId) throw new Error("encounterId is required");

  return apiFetch(`/encounters/${encounterId}/finalize_note/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * List encounter amendments (per-section corrections).
 *
 * Backend:
 *   GET /encounters/{id}/amendments/
 *   GET /encounters/{id}/amendments/?section=...
 */
export async function listEncounterAmendments(encounterId, opts = {}) {
  if (!encounterId) throw new Error("encounterId is required");

  const sp = new URLSearchParams();
  if (opts?.section) sp.set("section", opts.section);
  const qs = sp.toString();

  return apiFetch(`/encounters/${encounterId}/amendments/${qs ? `?${qs}` : ""}`);
}

/**
 * Add an encounter amendment (per-section correction).
 *
 * Backend:
 *   POST /encounters/{id}/amend/
 *
 * Payload (required):
 *   - section (e.g. 'HPI', 'PLAN')
 *   - reason
 *   - content
 */
export async function addEncounterAmendment(encounterId, payload = {}) {
  if (!encounterId) throw new Error("encounterId is required");

  return apiFetch(`/encounters/${encounterId}/amend/`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}
