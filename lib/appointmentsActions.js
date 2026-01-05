// lib/appointmentsActions.js
import { apiFetch } from "@/lib/api";

// Match backend enums (appointments/enums.py)
// These types support auto-billing on check-in
export const APPT_TYPES = [
  { value: "CONSULTATION", label: "Consultation" },
  { value: "FOLLOW_UP", label: "Follow-up Visit" },
  { value: "PROCEDURE", label: "Procedure" },
  { value: "DIAGNOSTIC_NON_LAB", label: "Diagnostic (Non-Lab)" },
  { value: "NURSING_CARE", label: "Nursing Care" },
  { value: "THERAPY_REHAB", label: "Therapy/Rehabilitation" },
  { value: "MENTAL_HEALTH", label: "Mental Health" },
  { value: "IMMUNIZATION", label: "Immunization/Vaccination" },
  { value: "MATERNAL_CHILD_CARE", label: "Maternal/Child Care" },
  { value: "SURGICAL_PRE_POST", label: "Surgical (Pre/Post-op)" },
  { value: "EMERGENCY_NON_ER", label: "Emergency (Non-ER)" },
  { value: "TELEMEDICINE", label: "Telemedicine" },
  { value: "HOME_VISIT", label: "Home Visit" },
  { value: "ADMIN_HMO_REVIEW", label: "Administrative/HMO Review" },
  { value: "LAB", label: "Lab Visit" },
  { value: "IMAGING", label: "Imaging Visit" },
  { value: "PHARMACY", label: "Pharmacy Pickup" },
  { value: "OTHER", label: "Other" },
];

export const APPT_STATUS = {
  SCHEDULED: "SCHEDULED",
  CHECKED_IN: "CHECKED_IN",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
};

// Terminal statuses where no further actions are possible
export const TERMINAL_STATUSES = [
  APPT_STATUS.COMPLETED,
  APPT_STATUS.CANCELLED,
  APPT_STATUS.NO_SHOW,
];

export const APPT_ACTION_LABELS = {
  check_in: "Check in",
  complete: "Complete",
  cancel: "Cancel",
  no_show: "No-show",
};

/**
 * Create a new appointment.
 *
 * Expected payload fields (all lowercase, matching DRF serializer):
 *  - patient (number, REQUIRED)
 *  - appt_type (string, from APPT_TYPES .value)
 *  - start_at (ISO datetime string)
 *  - end_at   (ISO datetime string)
 *  - reason? (string)
 *  - provider? (number, optional)
 *  - facility? (number, optional)
 *  - notify_email? (string, optional)
 */
export async function createAppointment(payload) {
  return apiFetch("/appointments/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * POST /appointments/:id/<action>/ for status transitions.
 *
 * action must be one of: "check_in" | "complete" | "cancel" | "no_show"
 * 
 * Response includes billing info when checking in:
 *  {
 *    ...appointment,
 *    charge_created: boolean,
 *    charge_id: number | null,
 *    charge_amount: string | null,
 *    charge_error: string | null
 *  }
 */
export async function postAppointmentAction(id, action) {
  if (!id || !action) {
    throw new Error("id and action are required");
  }
  return apiFetch(`/appointments/${id}/${action}/`, {
    method: "POST",
  });
}

/**
 * Get appointment service pricing for the current facility/provider scope.
 * 
 * Returns pricing for all appointment types showing:
 *  - service_code (e.g., "APPT:CONSULTATION")
 *  - service_name
 *  - default_price
 *  - custom_price (if override exists)
 *  - is_custom (boolean)
 */
export async function getAppointmentServicePrices() {
  return apiFetch("/appointments/service_prices/", {
    method: "GET",
  });
}

/**
 * Determine what actions are available based on appointment status and encounter state.
 *
 * @param {string} status - Appointment status (SCHEDULED, CHECKED_IN, etc.)
 * @param {object} options - Optional additional context
 * @param {boolean} options.hasEncounter - Whether appointment has linked encounter
 * @param {string} options.encounterStatus - Status of linked encounter if any
 * @returns {string[]} Array of available action names
 */
export function getAvailableActions(status, options = {}) {
  const { hasEncounter, encounterStatus } = options;
  const statusUpper = (status || "").toUpperCase();

  // Terminal states - no actions
  if (TERMINAL_STATUSES.includes(statusUpper)) {
    return [];
  }

  // Check if encounter is active (not closed/crossed out)
  const encounterActive =
    hasEncounter &&
    encounterStatus &&
    !["CLOSED", "CROSSED_OUT"].includes(encounterStatus.toUpperCase());

  switch (statusUpper) {
    case APPT_STATUS.SCHEDULED:
      // If encounter is active, only allow cancel (patient left without being seen)
      if (encounterActive) {
        return ["cancel"];
      }
      return ["check_in", "cancel", "no_show"];

    case APPT_STATUS.CHECKED_IN:
      // If encounter is active, they should close the encounter to complete
      if (encounterActive) {
        return ["cancel"];
      }
      return ["complete", "cancel"];

    default:
      return [];
  }
}

/**
 * Check if an encounter can be started for this appointment.
 *
 * @param {object} appointment - Appointment object
 * @returns {boolean}
 */
export function canStartEncounter(appointment) {
  if (!appointment) return false;

  const status = (appointment.status || "").toUpperCase();

  // Cannot start on terminal statuses
  if (TERMINAL_STATUSES.includes(status)) {
    return false;
  }

  // If the backend already computed this, use it
  if (typeof appointment.can_start_encounter === "boolean") {
    return appointment.can_start_encounter;
  }

  // If no encounter linked, can start
  if (!appointment.encounter_id && !appointment.has_encounter) {
    return true;
  }

  // If encounter exists, check its status
  const encStatus = (appointment.encounter_status || "").toUpperCase();
  if (!encStatus) {
    return true; // Encounter was deleted or status unknown
  }

  // Can only start new encounter if previous is closed/crossed out
  return ["CLOSED", "CROSSED_OUT"].includes(encStatus);
}

/**
 * Get status badge styling info
 *
 * @param {string} status - Appointment status
 * @returns {object} { colorClass, label }
 */
export function getStatusBadgeInfo(status) {
  const statusUpper = (status || "").toUpperCase();

  const statusMap = {
    SCHEDULED: {
      colorClass: "bg-slate-50 text-slate-700 ring-slate-200",
      label: "Scheduled",
    },
    CHECKED_IN: {
      colorClass: "bg-blue-50 text-blue-700 ring-blue-200",
      label: "Checked In",
    },
    COMPLETED: {
      colorClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      label: "Completed",
    },
    CANCELLED: {
      colorClass: "bg-rose-50 text-rose-700 ring-rose-200",
      label: "Cancelled",
    },
    NO_SHOW: {
      colorClass: "bg-amber-50 text-amber-700 ring-amber-200",
      label: "No-show",
    },
  };

  return (
    statusMap[statusUpper] || {
      colorClass: "bg-slate-50 text-slate-600 ring-slate-200",
      label: status || "Unknown",
    }
  );
}

/**
 * Get friendly label for appointment type
 */
export function getAppointmentTypeLabel(type) {
  const apptType = APPT_TYPES.find((t) => t.value === type);
  return apptType?.label || type || "—";
}