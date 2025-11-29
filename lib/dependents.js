// lib/dependents.js
import { apiFetch } from "@/lib/api";

/**
 * Base API path for dependents.
 *
 * This maps to the backend router:
 *   /api/patients/dependents/
 */
const BASE = "/patients/dependents/";

/**
 * Fetch dependents for the current logged-in user.
 *
 * Backend behaviour:
 *   - Patient users (guardians): only their own dependents.
 *   - Staff/clinical/admin: dependents within their facility, as scoped
 *     by the backend queryset.
 */
export async function fetchDependents() {
  const res = await apiFetch(BASE, {
    method: "GET",
  });

  // apiFetch throws on non-2xx, so getting here means success.
  // Handle both plain-array and paginated responses.
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.results)) return res.results;
  return [];
}

/**
 * Create a new dependent.
 *
 * For a patient (guardian) user:
 *   payload:
 *     {
 *       first_name: string,
 *       last_name: string,
 *       dob?: string (YYYY-MM-DD),
 *       gender?: string,
 *     }
 *
 * For staff/clinical/admin:
 *   payload:
 *     {
 *       parent_patient_id: number,  // REQUIRED
 *       first_name: string,
 *       last_name: string,
 *       dob?: string,
 *       gender?: string,
 *     }
 */
export async function createDependent(payload) {
  const res = await apiFetch(BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res;
}

/**
 * Update an existing dependent.
 *
 * payload can contain any updatable fields, e.g.:
 *   { first_name?, last_name?, dob?, gender? }
 */
export async function updateDependent(id, payload) {
  if (!id) {
    throw new Error("id is required to update a dependent");
  }

  const res = await apiFetch(`${BASE}${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res;
}

/**
 * Delete a dependent.
 */
export async function deleteDependent(id) {
  if (!id) {
    throw new Error("id is required to delete a dependent");
  }

  await apiFetch(`${BASE}${id}/`, {
    method: "DELETE",
  });
}
