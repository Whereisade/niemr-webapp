// lib/labsActions.js

import { apiFetch } from "@/lib/api";

/**
 * Create a new lab order.
 *
 * Expected payload (first pass – tweak if backend 400s):
 * {
 *   patient: number,        // required
 *   test_name?: string,     // free text for now
 *   priority?: string,      // e.g. "ROUTINE" | "URGENT" | "STAT"
 *   notes?: string,
 * }
 */
export async function createLabOrder(payload) {
  const res = await apiFetch("/labs/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  // apiFetch throws on non-2xx; if we get here it's OK
  return res;
}
