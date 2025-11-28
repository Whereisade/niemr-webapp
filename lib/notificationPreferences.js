// lib/notificationPreferences.js

import { apiFetch } from "@/lib/api";

/**
 * Fetch the current user's notification preferences.
 *
 * Assumes:
 *   GET /notifications/preferences/
 *
 * Returns an object (key/value pairs).
 */
export async function fetchNotificationPreferences() {
  return apiFetch("/notifications/prefs/", {
    method: "GET",
  });
}

/**
 * Update the current user's notification preferences.
 *
 * Assumes:
 *   PATCH /notifications/preferences/
 *
 * We send back the whole object (or partial) that we have in state.
 */
export async function updateNotificationPreferences(preferences) {
  return apiFetch("/notifications/prefs/", {
    method: "PATCH",
    body: JSON.stringify(preferences),
  });
}
