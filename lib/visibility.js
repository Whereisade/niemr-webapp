// lib/visibility.js
// API client functions for visibility settings

import { apiFetch } from "@/lib/api";

/**
 * Fetch the current visibility settings for the logged-in user.
 * 
 * Returns:
 * {
 *   is_publicly_visible: boolean,
 *   entity_type: "facility" | "provider",
 *   entity_name: string,
 *   role: string
 * }
 * 
 * GET /accounts/visibility/
 */
export async function fetchVisibilitySettings() {
  return apiFetch("/accounts/visibility/", {
    method: "GET",
  });
}

/**
 * Update the visibility settings for the logged-in user.
 * 
 * @param {boolean} isPubliclyVisible - Whether the entity should be publicly visible
 * 
 * Returns:
 * {
 *   is_publicly_visible: boolean,
 *   entity_type: "facility" | "provider",
 *   entity_name: string,
 *   message: string
 * }
 * 
 * PATCH /accounts/visibility/
 */
export async function updateVisibilitySettings(isPubliclyVisible) {
  return apiFetch("/accounts/visibility/", {
    method: "PATCH",
    body: JSON.stringify({
      is_publicly_visible: isPubliclyVisible,
    }),
  });
}