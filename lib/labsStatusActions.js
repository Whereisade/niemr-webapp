// lib/labsStatusActions.js

import { apiFetch } from "@/lib/api";

/**
 * Mark sample(s) collected for a lab order.
 * Optionally pass itemIds array to collect a subset.
 *
 * Backend endpoint:
 *   POST /labs/orders/:id/collect/
 *   Body: { "item_ids": [<id>, ...] } (optional)
 */
export async function markLabOrderCollected(orderId, itemIds) {
  if (!orderId) {
    throw new Error("orderId is required");
  }

  const body = {};
  if (Array.isArray(itemIds) && itemIds.length) {
    body.item_ids = itemIds;
  }

  return apiFetch(`/labs/orders/${orderId}/collect/`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Enter a single result for a given order item.
 *
 * Backend endpoint:
 *   POST /labs/orders/:id/result/
 *
 * payload must include:
 *   {
 *     item_id: number,
 *     result_value?: string | number,
 *     result_text?: string,
 *     result_unit?: string,
 *     ref_low?: string | number,
 *     ref_high?: string | number,
 *     flag?: string
 *   }
 */
export async function submitLabResult(orderId, payload) {
  if (!orderId) {
    throw new Error("orderId is required");
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("payload is required");
  }

  return apiFetch(`/labs/orders/${orderId}/result/`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Cancel a lab order (recommended when status is PENDING or IN_PROGRESS).
 *
 * Backend endpoint:
 *   POST /labs/orders/:id/cancel/
 */
export async function cancelLabOrder(orderId) {
  if (!orderId) {
    throw new Error("orderId is required");
  }

  return apiFetch(`/labs/orders/${orderId}/cancel/`, {
    method: "POST",
  });
}
