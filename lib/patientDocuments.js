// lib/patientDocuments.js
import { apiFetch } from "@/lib/api"; // if your helper is "@/lib/api", just change this import

export async function fetchMyDocuments() {
  const body = await apiFetch("/patients/documents/");
  // handle both paginated and non-paginated DRF styles
  return body?.results ?? body ?? [];
}

export async function uploadPatientDocument({ file, documentType, title, notes }) {
  const formData = new FormData();
  formData.append("file", file);
  if (documentType) formData.append("document_type", documentType);
  if (title) formData.append("title", title);
  if (notes) formData.append("notes", notes);

  const result = await apiFetch("/patients/documents/", {
    method: "POST",
    body: formData,
  });

  return result;
}

export async function deletePatientDocument(id) {
  await apiFetch(`/patients/documents/${id}/`, {
    method: "DELETE",
  });
}

export async function fetchDocumentsForPatient(patientId) {
  if (!patientId) {
    throw new Error("patientId is required");
  }

  const body = await apiFetch(
    `/patients/documents/?patient=${encodeURIComponent(patientId)}`
  );
  return body?.results ?? body ?? [];
}