// lib/labsActions.js

import { apiFetch } from "@/lib/api";

/**
 * Create a new lab order.
 *
 * Backend expects:
 * {
 *   patient: number,                       // required
 *   priority?: "ROUTINE" | "URGENT" | "STAT",
 *   note?: string,                         // optional clinical note
 *   items: [
 *     {
 *       test_code: string,                 // must match LabTest.code
 *     }
 *   ],
 *   provider?: number,                     // optional, if you pass it
 * }
 */
export async function createLabOrder(payload) {
  const res = await apiFetch("/labs/orders/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  // apiFetch throws on non-2xx; if we get here it's OK
  return res;
}
