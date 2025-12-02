// lib/encounterActions.js
import { apiFetch } from "@/lib/api";

/**
 * Close an encounter.
 *
 * Backend:
 *   POST /encounters/{id}/close/
 */
export async function closeEncounter(encounterId) {
  if (!encounterId) {
    throw new Error("encounterId is required");
  }

  return apiFetch(`/encounters/${encounterId}/close/`, {
    method: "POST",
    body: JSON.stringify({}), // no payload for now
  });
}

/**
 * Cross out an encounter.
 *
 * Backend:
 *   POST /encounters/{id}/cross_out/
 */
export async function crossOutEncounter(encounterId) {
  if (!encounterId) {
    throw new Error("encounterId is required");
  }

  return apiFetch(`/encounters/${encounterId}/cross_out/`, {
    method: "POST",
    body: JSON.stringify({}), // keep simple; adjust later if backend needs extra fields
  });
}

/**
 * (For future) Amend encounter.
 *
 * Backend:
 *   POST /encounters/{id}/amend/
 * We’ll wire UI later if needed.
 */
export async function amendEncounter(encounterId, payload = {}) {
  if (!encounterId) {
    throw new Error("encounterId is required");
  }

  return apiFetch(`/encounters/${encounterId}/amend/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
