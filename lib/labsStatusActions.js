// lib/labsStatusActions.js

import { apiFetch } from "@/lib/api";

/**
 * Update lab order status.
 *
 * Backend LabOrderViewSet supports PATCH on /labs/orders/:id/
 * with payload like { "status": "COLLECTED" } etc.
 *
 * Valid statuses (per your enums):
 *   PENDING, COLLECTED, REPORTED, CANCELLED
 */
export async function updateLabOrderStatus(orderId, nextStatus) {
  if (!orderId || !nextStatus) {
    throw new Error("orderId and nextStatus are required");
  }

  const res = await apiFetch(`/labs/orders/${orderId}/`, {
    method: "PATCH",
    body: JSON.stringify({ status: nextStatus }),
  });

  return res;
}
