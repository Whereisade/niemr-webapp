// lib/imagingAttachments.js

import { apiFetch } from "@/lib/api";

/**
 * List attachments for a given imaging request.
 *
 * Uses the global attachments endpoint with an imaging_request filter.
 */
export async function listImagingAttachments(requestId) {
  if (!requestId) throw new Error("requestId is required");

  const qs = new URLSearchParams();
  qs.set("imaging_request", String(requestId));

  // GET /attachments/?imaging_request=ID
  return apiFetch(`/attachments/?${qs.toString()}`, {
    method: "GET",
  });
}

/**
 * Upload an attachment for an imaging request.
 *
 * POST /attachments/ with:
 *   - file
 *   - imaging_request
 *   - description (optional)
 */
export async function uploadImagingAttachment(requestId, file, description) {
  if (!requestId) throw new Error("requestId is required");
  if (!file) throw new Error("file is required");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("imaging_request", String(requestId));
  if (description) {
    formData.append("description", description);
  }

  return apiFetch("/attachments/", {
    method: "POST",
    body: formData,
  });
}

/**
 * Delete a single attachment.
 *
 * DELETE /attachments/:id/
 */
export async function deleteImagingAttachment(requestId, attachmentId) {
  if (!attachmentId) {
    throw new Error("attachmentId is required");
  }

  return apiFetch(`/attachments/${attachmentId}/`, {
    method: "DELETE",
  });
}
