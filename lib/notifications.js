// lib/notifications.js
import { apiFetch } from "@/lib/api";

/**
 * Fetch notifications for the current logged-in user.
 * Backend is expected to scope to the user based on JWT.
 */
export async function fetchNotifications({ page = 1, limit = 20 } = {}) {
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  // Adjust path if backend uses a slightly different one,
  // e.g. "/notifications/items/" – for now we start with "/notifications/".
  return apiFetch(`/notifications/?${qs.toString()}`);
}

/**
 * Mark a single notification as read.
 * Adjust the path if your backend uses a different action shape.
 */
export async function markNotificationRead(id) {
  if (!id) throw new Error("Notification ID is required");

  return apiFetch(`/notifications/${id}/mark-read/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsRead() {
  return apiFetch("/notifications/mark-all-read/", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
