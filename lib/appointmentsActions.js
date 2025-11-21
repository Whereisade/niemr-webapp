// lib/appointmentsActions.js
import { apiFetch } from "@/lib/api";

// Match backend enums (appointments/enums.py)
export const APPT_TYPES = [
  { value: "CONSULT",   label: "Consultation" },
  { value: "FOLLOW_UP", label: "Follow-up" },
  { value: "LAB",       label: "Lab Visit" },
  { value: "IMAGING",   label: "Imaging Visit" },
  { value: "PHARMACY",  label: "Pharmacy Pickup" },
  { value: "OTHER",     label: "Other" },
];

export const APPT_STATUS = {
  SCHEDULED: "SCHEDULED",
  CHECKED_IN: "CHECKED_IN",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
};

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
 * (Via Next.js proxy: /api/proxy/appointments/:id/<action>/ underneath apiFetch)
 *
 * action must be one of: "check_in" | "complete" | "cancel" | "no_show"
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
 * For provider/facility dashboards: what actions we show based on status.
 * This is purely UI logic; backend still enforces rules.
 */
export function getAvailableActions(status) {
  switch (status) {
    case APPT_STATUS.SCHEDULED:
      // Provider/facility can:
      //  - check_in
      //  - cancel
      //  - mark no_show
      return ["check_in", "cancel", "no_show"];
    case APPT_STATUS.CHECKED_IN:
      // Once checked in:
      //  - complete
      //  - cancel (if needed)
      return ["complete", "cancel"];
    default:
      // COMPLETED / CANCELLED / NO_SHOW -> no further actions
      return [];
  }
}
