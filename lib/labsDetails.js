// lib/labsDetails.js

import { apiFetch } from "@/lib/api";

/**
 * Fetch a single lab order by ID.
 *
 * Uses the same /labs/orders/ namespace as creation.
 */
export async function fetchLabOrderById(id) {
  if (!id) {
    throw new Error("Lab order ID is required");
  }

  const res = await apiFetch(`/labs/orders/${id}/`, {
    method: "GET",
  });

  return res;
}
