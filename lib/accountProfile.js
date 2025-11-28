// lib/accountProfile.js

import { apiFetch } from "@/lib/api";

/**
 * Fetch the current logged-in account profile.
 *
 * GET /accounts/me/
 */
export async function fetchAccountProfile() {
  return apiFetch("/accounts/me/", {
    method: "GET",
  });
}

/**
 * Update parts of the current account profile.
 *
 * PATCH /accounts/me/
 *
 * We expect the backend to accept e.g.
 *   { first_name, last_name }
 * Email is usually immutable, so we will not change it here.
 */
export async function updateAccountProfile(payload) {
  return apiFetch("/accounts/me/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
