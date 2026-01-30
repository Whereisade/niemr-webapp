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

/**
 * Change password for the current authenticated account.
 *
 * POST /accounts/password/change/
 * Body: { current_password, new_password, confirm_password }
 */
export async function changeAccountPassword(payload) {
  return apiFetch("/accounts/password/change/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
