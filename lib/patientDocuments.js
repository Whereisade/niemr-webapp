// lib/patientDocuments.js
import { apiFetch } from "@/lib/api";

export async function fetchMyDocuments() {
  const body = await apiFetch("/patients/documents/");
  // handle both paginated and non-paginated DRF styles
  return body?.results ?? body ?? [];
}

export async function uploadPatientDocument({ 
  file, 
  documentType, 
  title, 
  notes, 
  patientId  // 🔧 Accept patientId parameter (optional for patients, required for staff)
}) {
  const formData = new FormData();
  formData.append("file", file);
  if (documentType) formData.append("document_type", documentType);
  if (title) formData.append("title", title);
  if (notes) formData.append("notes", notes);
  
  // 🔧 Include patient ID for staff uploads
  // For patient uploads, patientId will be undefined, which is fine - backend handles it
  if (patientId !== undefined && patientId !== null && patientId !== "") {
    formData.append("patient", String(patientId));
  }

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