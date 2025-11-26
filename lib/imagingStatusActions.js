// lib/imagingStatusActions.js

import { apiFetch } from "@/lib/api";

/**
 * Update imaging request status.
 *
 * We assume ImagingRequestViewSet supports PATCH on:
 *   /imaging/requests/:id/
 * with payload: { "status": "<ENUM>" }
 *
 * Likely status enums (adjust if backend returns 400 and expose real names):
 *   PENDING, SCHEDULED, REPORTED, CANCELLED
 */
export async function updateImagingRequestStatus(requestId, nextStatus) {
  if (!requestId || !nextStatus) {
    throw new Error("requestId and nextStatus are required");
  }

  const res = await apiFetch(`/imaging/requests/${requestId}/`, {
    method: "PATCH",
    body: JSON.stringify({ status: nextStatus }),
  });

  return res;
}
