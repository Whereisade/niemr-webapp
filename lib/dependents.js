// lib/dependents.js
import { apiFetch } from "@/lib/api";

// collection endpoint → /api/patients/dependents/
const BASE = "/patients/dependents/";

export async function fetchDependents() {
  return apiFetch(BASE, {
    method: "GET",
  });
}

export async function createDependent(payload) {
  return apiFetch(BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
