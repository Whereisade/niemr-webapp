// lib/notifications.js

import { apiFetch } from "@/lib/api";

/**
 * Fetch notifications for the current logged-in user.
 *
 * Assumes backend:
 *   GET /notifications/?page=&limit=&unread=true|false
 */
export async function fetchNotifications({
  page = 1,
  limit = 20,
  unread = null,
} = {}) {
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  if (unread !== null) {
    qs.set("unread", unread ? "true" : "false");
  }

  return apiFetch(`/notifications/?${qs.toString()}`, {
    method: "GET",
  });
}

/**
 * Mark a single notification as read.
 *
 * Assumes:
 *   POST /notifications/{id}/mark_read/
 */
export async function markNotificationRead(id) {
  if (!id) throw new Error("Notification id is required");
  return apiFetch(`/notifications/${id}/mark_read/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * Mark all notifications as read.
 *
 * Assumes:
 *   POST /notifications/mark_all_read/
 */
export async function markAllNotificationsRead() {
  return apiFetch(`/notifications/mark_all_read/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
