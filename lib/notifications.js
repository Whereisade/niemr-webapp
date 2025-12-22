// lib/notifications.js

import { apiFetch } from "@/lib/api";

/**
 * Fetch notifications for the current logged-in user.
 *
 * @param {Object} options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {boolean|null} options.read - Filter by read status
 * @param {boolean} options.archived - Include archived (default: false)
 * @param {string} options.priority - Filter by priority (LOW, NORMAL, HIGH, URGENT)
 * @param {string} options.topic - Filter by topic
 * @param {string} options.since - ISO datetime, notifications created after this
 * @param {string} options.group_key - Filter by group key
 * @param {string} options.search - Search in title and body
 */
export async function fetchNotifications({
  page = 1,
  limit = 20,
  read = null,
  archived = false,
  priority = null,
  topic = null,
  since = null,
  group_key = null,
  search = null,
} = {}) {
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  if (read !== null) {
    qs.set("read", read ? "true" : "false");
  }
  if (archived) {
    qs.set("archived", "true");
  }
  if (priority) {
    qs.set("priority", priority);
  }
  if (topic) {
    qs.set("topic", topic);
  }
  if (since) {
    qs.set("since", since);
  }
  if (group_key) {
    qs.set("group_key", group_key);
  }
  if (search) {
    qs.set("search", search);
  }

  return apiFetch(`/notifications/?${qs.toString()}`, {
    method: "GET",
  });
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(id) {
  if (!id) throw new Error("Notification id is required");
  return apiFetch(`/notifications/${id}/read/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * Mark a single notification as unread.
 */
export async function markNotificationUnread(id) {
  if (!id) throw new Error("Notification id is required");
  return apiFetch(`/notifications/${id}/unread/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * Archive a notification.
 */
export async function archiveNotification(id) {
  if (!id) throw new Error("Notification id is required");
  return apiFetch(`/notifications/${id}/archive/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * Unarchive a notification.
 */
export async function unarchiveNotification(id) {
  if (!id) throw new Error("Notification id is required");
  return apiFetch(`/notifications/${id}/unarchive/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsRead() {
  return apiFetch(`/notifications/read_all/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * Archive all read notifications.
 */
export async function archiveAllReadNotifications() {
  return apiFetch(`/notifications/archive_all_read/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * Batch mark notifications as read.
 * @param {number[]} ids - Array of notification IDs
 */
export async function batchMarkRead(ids) {
  if (!Array.isArray(ids) || !ids.length) {
    throw new Error("ids array is required");
  }
  return apiFetch(`/notifications/batch_read/`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

/**
 * Batch archive notifications.
 * @param {number[]} ids - Array of notification IDs
 */
export async function batchArchive(ids) {
  if (!Array.isArray(ids) || !ids.length) {
    throw new Error("ids array is required");
  }
  return apiFetch(`/notifications/batch_archive/`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

/**
 * Batch delete notifications.
 * @param {number[]} ids - Array of notification IDs
 */
export async function batchDelete(ids) {
  if (!Array.isArray(ids) || !ids.length) {
    throw new Error("ids array is required");
  }
  return apiFetch(`/notifications/batch_delete/`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

/**
 * Fetch notification stats.
 * Returns: { total, unread, read, archived, by_priority, by_topic }
 */
export async function fetchNotificationStats() {
  return apiFetch(`/notifications/stats/`, {
    method: "GET",
  });
}

/**
 * Fetch unread count (lightweight endpoint for badge).
 * Returns: { count, urgent_count }
 */
export async function fetchUnreadCount() {
  return apiFetch(`/notifications/unread_count/`, {
    method: "GET",
  });
}

/**
 * Fetch recent notifications for dropdown preview.
 * @param {number} limit - Number of items (default: 5)
 * Returns: { items, total_unread }
 */
export async function fetchRecentNotifications(limit = 5) {
  const qs = new URLSearchParams();
  qs.set("limit", String(limit));
  return apiFetch(`/notifications/recent/?${qs.toString()}`, {
    method: "GET",
  });
}

/**
 * Fetch available notification topics.
 * Returns: [{ value, label }, ...]
 */
export async function fetchNotificationTopics() {
  return apiFetch(`/notifications/topics/`, {
    method: "GET",
  });
}

/**
 * Fetch available notification priorities.
 * Returns: [{ value, label, color }, ...]
 */
export async function fetchNotificationPriorities() {
  return apiFetch(`/notifications/priorities/`, {
    method: "GET",
  });
}

// ============================================================
// Preferences API
// ============================================================

/**
 * Fetch user notification preferences.
 */
export async function fetchNotificationPreferences() {
  return apiFetch(`/notifications/preferences/`, {
    method: "GET",
  });
}

/**
 * Get all preference options (topics × channels matrix).
 */
export async function fetchPreferenceOptions() {
  return apiFetch(`/notifications/preferences/all_options/`, {
    method: "GET",
  });
}

/**
 * Bulk update preferences.
 * @param {Object[]} preferences - Array of { topic, channel, enabled }
 */
export async function bulkUpdatePreferences(preferences) {
  return apiFetch(`/notifications/preferences/bulk_update/`, {
    method: "POST",
    // Backend expects {items:[{topic,channel,enabled}]}
    body: JSON.stringify({ items: preferences }),
  });
}

/**
 * Facility broadcast announcements
 * - List: GET /notifications/announcements/
 * - Create: POST /notifications/announcements/
 */
export async function fetchAnnouncements(params = {}) {
  const qs = toQS(params);
  return apiFetch(`/notifications/announcements/${qs}`, {
    method: "GET",
  });
}

export async function createAnnouncement(payload) {
  return apiFetch(`/notifications/announcements/`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

/**
 * Enable all preferences for a channel.
 * @param {string} channel - IN_APP, EMAIL, SMS, or PUSH
 */
export async function enableAllForChannel(channel) {
  return apiFetch(`/notifications/preferences/enable_all/`, {
    method: "POST",
    body: JSON.stringify({ channel }),
  });
}

/**
 * Disable all preferences for a channel.
 * @param {string} channel - IN_APP, EMAIL, SMS, or PUSH
 */
export async function disableAllForChannel(channel) {
  return apiFetch(`/notifications/preferences/disable_all/`, {
    method: "POST",
    body: JSON.stringify({ channel }),
  });
}

// ============================================================
// Reminders API
// ============================================================

/**
 * Fetch reminders.
 */
export async function fetchReminders(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) {
      qs.set(k, String(v));
    }
  });
  return apiFetch(`/notifications/reminders/?${qs.toString()}`, {
    method: "GET",
  });
}

/**
 * Acknowledge a reminder.
 */
export async function acknowledgeReminder(id) {
  if (!id) throw new Error("Reminder id is required");
  return apiFetch(`/notifications/reminders/${id}/acknowledge/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * Dismiss a reminder.
 */
export async function dismissReminder(id) {
  if (!id) throw new Error("Reminder id is required");
  return apiFetch(`/notifications/reminders/${id}/dismiss/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * Get reminders due now.
 */
export async function fetchRemindersDueNow() {
  return apiFetch(`/notifications/reminders/due_now/`, {
    method: "GET",
  });
}

// ============================================================
// Constants
// ============================================================

export const PRIORITY_COLORS = {
  URGENT: {
    bg: "bg-red-50",
    text: "text-red-700",
    ring: "ring-red-200",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700",
  },
  HIGH: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700",
  },
  NORMAL: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-200",
    dot: "bg-blue-500",
    badge: "bg-blue-100 text-blue-700",
  },
  LOW: {
    bg: "bg-slate-50",
    text: "text-slate-600",
    ring: "ring-slate-200",
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600",
  },
};

export const TOPIC_LABELS = {
  LAB_RESULT_READY: "Lab Result",
  LAB_RESULT_CRITICAL: "Critical Lab",
  PRESCRIPTION_READY: "Prescription",
  PRESCRIPTION_REFILL: "Refill Reminder",
  APPOINTMENT_REMINDER: "Appointment",
  APPOINTMENT_CANCELLED: "Cancelled",
  APPOINTMENT_NO_SHOW: "No-show",
  APPOINTMENT_RESCHEDULED: "Rescheduled",
  APPOINTMENT_CONFIRMED: "Confirmed",
  ENCOUNTER_CREATED: "Encounter",
  ENCOUNTER_COMPLETED: "Encounter Done",
  ENCOUNTER_UPDATED: "Encounter Updated",
  MESSAGE: "Message",
  BILLING: "Billing",
  PAYMENT_DUE: "Payment Due",
  PAYMENT_RECEIVED: "Payment",
  STAFF_ASSIGNED: "Staff",
  ALLERGY_ALERT: "Allergy Alert",
  VITAL_ALERT: "Vital Alert",
  REMINDER: "Reminder",
  SYSTEM_ANNOUNCEMENT: "Announcement",
  SYSTEM_MAINTENANCE: "Maintenance",
  ACCOUNT: "Account",
  IMAGING_REPORT_READY: "Imaging",
  APPT_REMINDER: "Appointment",
  BILL_CHARGE_ADDED: "Billing",
  BILL_PAYMENT_POSTED: "Payment",
  GENERAL: "General",
};

/**
 * Get display label for a topic.
 */
export function getTopicLabel(topic) {
  return TOPIC_LABELS[topic] || topic || "Notification";
}

/**
 * Get priority styling info.
 */
export function getPriorityStyle(priority) {
  return PRIORITY_COLORS[priority] || PRIORITY_COLORS.NORMAL;
}

/**
 * Format relative time (e.g., "2 hours ago").
 */
export function formatTimeAgo(dateString) {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  
  return date.toLocaleDateString();
}