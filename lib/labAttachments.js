// lib/labAttachments.js

import { apiFetch } from "@/lib/api";

/**
 * List attachments for a given lab order.
 *
 * We use the global attachments endpoint and filter by lab_order.
 * If backend later uses a different query param (e.g. "object_id" or "laborder"),
 * we only need to change it here.
 */
export async function listLabOrderAttachments(orderId) {
  if (!orderId) throw new Error("orderId is required");

  const qs = new URLSearchParams();
  qs.set("lab_order", String(orderId));

  // GET /attachments/?lab_order=1
  return apiFetch(`/attachments/?${qs.toString()}`, {
    method: "GET",
  });
}

/**
 * Upload an attachment for a lab order.
 *
 * We POST to /attachments/upload/ with multipart/form-data including:
 *  - file
 *  - lab_order
 *  - description (optional)
 */
export async function uploadLabOrderAttachment(orderId, file, description) {
  if (!orderId) throw new Error("orderId is required");
  if (!file) throw new Error("file is required");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("lab_order", String(orderId));
  if (description) {
    formData.append("description", description);
  }

  // POST /attachments/upload/
  return apiFetch("/attachments/upload/", {
    method: "POST",
    body: formData,
  });
}

/**
 * Delete a single attachment.
 *
 * Attachments are first-class resources:
 *   DELETE /attachments/:id/
 *
 * We keep the orderId arg for call sites but it is not needed for the URL.
 */
export async function deleteLabOrderAttachment(orderId, attachmentId) {
  if (!attachmentId) {
    throw new Error("attachmentId is required");
  }

  return apiFetch(`/attachments/${attachmentId}/`, {
    method: "DELETE",
  });
}
