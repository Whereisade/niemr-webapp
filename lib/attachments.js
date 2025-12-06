// lib/attachments.js
import { apiFetch } from "./api";

/**
 * List attachments for a given reference (e.g. encounter, lab, imaging, etc.)
 *
 * @param {Object} params
 * @param {string} params.refType - e.g. "ENCOUNTER", "LAB", "IMAGING", "PRESCRIPTION"
 * @param {string|number} params.refId - backend id of the record
 */
export async function listAttachments({ refType, refId }) {
  if (!refType || !refId) {
    throw new Error("refType and refId are required to list attachments");
  }

  const url =
    `/attachments/?ref_type=${encodeURIComponent(refType)}&ref_id=${encodeURIComponent(
      String(refId)
    )}`;

  return apiFetch(url);
}

/**
 * Upload one or more files for a given reference.
 *
 * @param {Object} params
 * @param {string} params.refType
 * @param {string|number} params.refId
 * @param {File[]} params.files - array of File objects from <input type="file">
 */
export async function uploadAttachments({ refType, refId, files }) {
  if (!refType || !refId) {
    throw new Error("refType and refId are required to upload attachments");
  }
  if (!files || !files.length) {
    return;
  }

  // We send one request per file to keep payload simple & predictable.
  const results = [];
  for (const file of files) {
    const form = new FormData();
    form.append("file", file);

    // These field names assume the backend Attachments API looks like:
    // - file
    // - ref_type
    // - ref_id
    form.append("ref_type", refType);
    form.append("ref_id", String(refId));

    // apiFetch will detect FormData and SHOULD NOT force application/json
    const res = await apiFetch("/attachments/upload/", {
      method: "POST",
      body: form,
    });

    results.push(res);
  }

  return results;
}

/**
 * Optional: delete a single attachment by id
 */
export async function deleteAttachment(id) {
  if (!id) return;
  return apiFetch(`/attachments/${id}/`, {
    method: "DELETE",
  });
}
