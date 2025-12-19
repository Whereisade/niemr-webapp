// lib/allergies.js
import { apiFetch } from "./api";

/**
 * Fetch allergies for the current patient (backend scopes by authenticated user)
 */
export async function fetchMyAllergies() {
  return apiFetch("/patients/allergies/");
}

/**
 * Create a new allergy record for the current patient
 */
export async function createAllergy(payload) {
  return apiFetch("/patients/allergies/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Update an existing allergy record
 */
export async function updateAllergy(id, payload) {
  return apiFetch(`/patients/allergies/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/**
 * Delete an allergy record
 */
export async function deleteAllergy(id) {
  return apiFetch(`/patients/allergies/${id}/`, {
    method: "DELETE",
  });
}

/**
 * Fetch allergies for a specific patient (for staff/provider use)
 */
export async function fetchPatientAllergies(patientId) {
  return apiFetch(`/patients/allergies/?patient=${patientId}`);
}

// Severity options
export const ALLERGY_SEVERITIES = [
  { value: "MILD", label: "Mild" },
  { value: "MODERATE", label: "Moderate" },
  { value: "SEVERE", label: "Severe" },
  { value: "LIFE_THREATENING", label: "Life-threatening" },
];

// Common allergy types/categories
export const ALLERGY_TYPES = [
  { value: "DRUG", label: "Drug / Medication" },
  { value: "FOOD", label: "Food" },
  { value: "ENVIRONMENTAL", label: "Environmental" },
  { value: "INSECT", label: "Insect" },
  { value: "LATEX", label: "Latex" },
  { value: "OTHER", label: "Other" },
];