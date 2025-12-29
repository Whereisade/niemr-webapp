// lib/roleUiConfig.js

// Core role groups – shared across app
export const FACILITY_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "FRONTDESK",
  "DOCTOR",
  "NURSE",
  "LAB",
  "PHARMACY",
];

export const PROVIDER_ROLES = ["DOCTOR", "NURSE", "LAB", "PHARMACY"];

export const PATIENT_ROLE = "PATIENT";

export const FACILITY_WORKSPACE_TYPES = {
  OWNER: "OWNER",        // SUPER_ADMIN / ADMIN
  FRONTDESK: "FRONTDESK",
  CLINICAL: "CLINICAL",  // DOCTOR / NURSE / LAB / PHARMACY
  GENERIC: "GENERIC",
};

/**
 * Map a facility user role into a "workspace flavour"
 * and standard header labels.
 */
export function getFacilityWorkspaceConfig(role) {
  let type = FACILITY_WORKSPACE_TYPES.GENERIC;

  if (["SUPER_ADMIN", "ADMIN"].includes(role)) {
    type = FACILITY_WORKSPACE_TYPES.OWNER;
  } else if (role === "FRONTDESK") {
    type = FACILITY_WORKSPACE_TYPES.FRONTDESK;
  } else if (["DOCTOR", "NURSE", "LAB", "PHARMACY"].includes(role)) {
    type = FACILITY_WORKSPACE_TYPES.CLINICAL;
  }

  let headerBadge = "Facility Workspace";
  let subtitle = "Facility workspace.";

  switch (type) {
    case FACILITY_WORKSPACE_TYPES.OWNER:
      headerBadge = "Facility Admin Workspace";
      subtitle =
        "Monitor operations, clinical load, and financials across the facility.";
      break;
    case FACILITY_WORKSPACE_TYPES.FRONTDESK:
      headerBadge = "Front Desk Workspace";
      subtitle = "Manage bookings, arrivals, and patient check-ins.";
      break;
    case FACILITY_WORKSPACE_TYPES.CLINICAL:
      headerBadge = "Facility Staff Workspace";
      subtitle = "See a quick overview of today’s activity at this facility.";
      break;
    default:
      headerBadge = "Facility Workspace";
      subtitle =
        "Monitor operations and clinical activity across the facility.";
  }

  return { type, headerBadge, subtitle };
}

/**
 * Provider workspace config – you can use this in app/provider/page.js
 * if you want to centralise that too.
 */
export function getProviderWorkspaceConfig(role, providerType) {
  const effectiveType = providerType || role || "OTHER";

  let headerBadge = "Provider Workspace";
  let subtitle = "Today’s schedule and recent clinical updates.";

  switch (effectiveType) {
    case "DOCTOR":
      headerBadge = "Doctor Workspace";
      subtitle = "Today’s schedule and recent clinical updates.";
      break;
    case "NURSE":
      headerBadge = "Nurse Workspace";
      subtitle = "Today’s schedule, observations, and tasks.";
      break;
    case "PHARMACIST":
    case "PHARMACY":
      headerBadge = "Pharmacy Workspace";
      subtitle = "Prescriptions and medication requests at a glance.";
      break;
    case "LAB_SCIENTIST":
    case "LAB":
      headerBadge = "Lab Scientist Workspace";
      subtitle = "Today’s lab orders and recent results.";
      break;
    case "DENTIST":
      headerBadge = "Dentist Workspace";
      subtitle = "Dental appointments and procedure pipeline.";
      break;
    case "OPTOMETRIST":
      headerBadge = "Optometrist Workspace";
      subtitle = "Eye-care appointments and clinical worklist.";
      break;
    case "PHYSIOTHERAPIST":
      headerBadge = "Physiotherapist Workspace";
      subtitle = "Therapy sessions, follow-ups, and progress notes.";
      break;
    default:
      break;
  }

  return { headerBadge, subtitle, providerType: effectiveType };
}
