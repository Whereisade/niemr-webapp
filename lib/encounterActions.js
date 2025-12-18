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

  return apiFetch(`/encounters/${encounterId}/amend/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
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
