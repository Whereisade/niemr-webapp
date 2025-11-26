// lib/imagingActions.js

import { apiFetch } from "@/lib/api";

/**
 * Create a new imaging request.
 *
 * First-pass payload shape (aligns with LabOrder-style pattern):
 * {
 *   patient: number,
 *   priority: "ROUTINE" | "URGENT" | "STAT",
 *   note?: string,
 *   items: [{ procedure_code: string }],
 *   provider?: number,   // optional (facility flow)
 * }
 */
export async function createImagingRequest(payload) {
  return apiFetch("/imaging/requests/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
