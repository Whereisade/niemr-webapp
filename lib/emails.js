// lib/emails.js
import { apiFetch } from "@/lib/api";

/**
 * Fetch email outbox entries.
 *
 * Assumes backend exposes something like:
 *   GET /emails/outbox/?page=&limit=&q=&status=
 *
 * If the final path is /emails/ instead of /emails/outbox/,
 * we only need to change OUTBOX_BASE once below.
 */
const OUTBOX_BASE = "/emails/outbox/";

export async function fetchEmailOutbox({
  page = 1,
  limit = 20,
  q = "",
  status = "",
} = {}) {
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  qs.set("page_size", String(limit));
  if (q) qs.set("q", q);
  if (status) qs.set("status", status);

  return apiFetch(`${OUTBOX_BASE}?${qs.toString()}`);
}

/**
 * Trigger a resend for a single email outbox entry.
 *
 * Assumes:
 *   POST /emails/outbox/:id/resend/
 *
 * If backend exposes /emails/:id/resend/ instead,
 * we can tweak this in one place.
 */
export async function resendEmailOutbox(id) {
  if (!id) throw new Error("Email outbox id is required");
  return apiFetch(`${OUTBOX_BASE}${id}/resend/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
