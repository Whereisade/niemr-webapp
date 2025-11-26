// lib/imagingDetails.js

import { apiFetch } from "@/lib/api";

/**
 * Fetch a single imaging request by ID.
 *
 * Uses the same /imaging/requests/ namespace as creation.
 */
export async function fetchImagingRequestById(id) {
  if (!id) {
    throw new Error("Imaging request ID is required");
  }

  const res = await apiFetch(`/imaging/requests/${id}/`, {
    method: "GET",
  });

  return res;
}
