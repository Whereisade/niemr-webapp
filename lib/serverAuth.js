// lib/serverAuth.js
// Server-only helpers for auth + role-based route guarding in App Router layouts/pages.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FACILITY_ROLES, PATIENT_ROLE } from "@/lib/roleUiConfig";

const BACKEND = process.env.NIEMR_BACKEND_URL || "http://localhost:8000";
const ACCESS_COOKIE = process.env.ACCESS_COOKIE || "niemr_access";

export const PROVIDER_ROLES = ["DOCTOR", "NURSE", "LAB", "PHARMACY"];
export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

export async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE)?.value || null;
}

export async function fetchMe() {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`${BACKEND}/api/accounts/me/`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function requireAuth(loginPath = "/login/provider") {
  const token = await getAccessToken();
  if (!token) redirect(loginPath);

  const me = await fetchMe();
  if (!me) redirect(loginPath);

  return { me, token };
}

export async function requireIndependentProvider(options = {}) {
  const {
    allowedRoles = PROVIDER_ROLES,
    loginPath = "/login/provider",
    redirectTo = "/provider",
  } = options;

  const { me, token } = await requireAuth(loginPath);

  const role = (me?.role || "").toUpperCase();

  // If user is facility staff, they should use the facility workspace.
  if (me?.facility) redirect("/facility");

  if (!allowedRoles.includes(role)) redirect(redirectTo);

  return { me, token };
}

export async function requireProviderRole(roles, options = {}) {
  const { redirectTo = "/provider" } = options;
  const { me, token } = await requireIndependentProvider({
    ...options,
    allowedRoles: PROVIDER_ROLES,
  });

  const role = (me?.role || "").toUpperCase();
  if (!roles.includes(role)) redirect(redirectTo);

  return { me, token };
}


export async function requireFacilityStaff(options = {}) {
  const {
    allowedRoles = FACILITY_ROLES,
    loginPath = "/login/facility",
  } = options;

  const { me, token } = await requireAuth(loginPath);
  const role = (me?.role || "").toUpperCase();

  // Facility workspace is only for users attached to a facility.
  if (!me?.facility) {
    if (PROVIDER_ROLES.includes(role)) redirect("/login");
    if (role === PATIENT_ROLE) redirect("/login");
    redirect(loginPath);
  }

  // Only facility roles are allowed.
  if (!allowedRoles.includes(role)) {
    if (PROVIDER_ROLES.includes(role)) redirect("/provider");
    if (role === PATIENT_ROLE) redirect("/patient");
    redirect(loginPath);
  }

  return { me, token };
}

export async function authedFetchJSON(token, apiPath, fallback = null) {
  try {
    const url = apiPath.startsWith("http")
      ? apiPath
      : `${BACKEND}/api${apiPath.startsWith("/") ? apiPath : `/${apiPath}`}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}


async function fetchOutreachMyEvent(token) {
  return await authedFetchJSON(token, "/outreach/my-event/", null);
}

export async function requireOutreachUser(options = {}) {
  const { loginPath = "/login/outreach" } = options;

  const { me, token } = await requireAuth(loginPath);

  // Outreach is only for:
  // 1) Outreach Super Admin (system super admin, not tied to a facility)
  // 2) Outreach staff accounts (have at least one active outreach profile)
  const role = (me?.role || "").toUpperCase();
  const isSystemSuperAdmin = role === "SUPER_ADMIN" && !me?.facility;

  const myEvent = await fetchOutreachMyEvent(token);
  const assignments = Array.isArray(myEvent?.assignments) ? myEvent.assignments : [];
  const isOutreachStaff = assignments.length > 0;

  if (!isSystemSuperAdmin && !isOutreachStaff) {
    // Route user back to their normal workspace
    if (me?.facility) redirect("/facility");
    if (PROVIDER_ROLES.includes(role)) redirect("/provider");
    if (role === PATIENT_ROLE) redirect("/patient");
    redirect(loginPath);
  }

  return { me, token, assignments };
}
