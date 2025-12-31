// lib/catalogActions.js
// API helper functions for catalog delete operations

import { apiFetch } from "@/lib/api";

/**
 * Delete a single lab test from the catalog
 */
export async function deleteLabTest(testId) {
  if (!testId) {
    throw new Error("testId is required");
  }

  return apiFetch(`/labs/catalog/${testId}/`, {
    method: "DELETE",
  });
}

/**
 * Clear entire lab catalog
 */
export async function clearLabCatalog() {
  return apiFetch("/labs/catalog/clear_catalog/", {
    method: "DELETE",
  });
}

/**
 * Delete a single drug from the pharmacy catalog
 */
export async function deleteDrug(drugId) {
  if (!drugId) {
    throw new Error("drugId is required");
  }

  return apiFetch(`/pharmacy/catalog/${drugId}/`, {
    method: "DELETE",
  });
}

/**
 * Clear entire pharmacy catalog
 */
export async function clearPharmacyCatalog() {
  return apiFetch("/pharmacy/catalog/clear_catalog/", {
    method: "DELETE",
  });
}