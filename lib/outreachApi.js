// lib/outreachApi.js
import { apiFetch } from "@/lib/api";

export function withEventId(path, eventId) {
  if (!eventId) return path;
  const hasQuery = path.includes("?");
  const sep = hasQuery ? "&" : "?";
  return `${path}${sep}event_id=${encodeURIComponent(String(eventId))}`;
}

export async function outreachFetch(path, { eventId, ...init } = {}) {
  return apiFetch(withEventId(path, eventId), init);
}

export function normalizeList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}
