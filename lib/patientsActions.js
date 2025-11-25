// lib/patientsActions.js

import { apiFetch } from "@/lib/api";

/**
 * Create a new patient via the NIEMR API.
 *
 * Minimal payload:
 * {
 *   first_name: string,
 *   last_name: string,
 *   email?: string,
 *   phone?: string,
 *   date_of_birth?: string (YYYY-MM-DD),
 *   gender?: string,
 * }
 *
 * Adjust fields if backend returns 400 with specific requirements.
 */
export async function createPatient(payload) {
  const res = await apiFetch("/patients/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  // apiFetch throws on non-2xx, so if we get here it's OK
  return res;
}
