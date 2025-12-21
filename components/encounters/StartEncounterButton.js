"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Stethoscope, Loader2, ArrowRight } from "lucide-react";

/**
 * Enhanced button to start or continue an encounter from an appointment.
 *
 * Handles both scenarios:
 * 1. Starting a new encounter (if none exists)
 * 2. Continuing an existing encounter (if one was already started by a nurse)
 *
 * Props:
 * - scope: "facility" | "provider" - determines redirect path
 * - appointment: appointment object with id, status, encounter_id, etc.
 * - size: "sm" | "md" (default "sm")
 * - className: additional CSS classes
 * - onSuccess: callback after successful encounter creation/continuation
 */
export default function StartEncounterButton({
  scope = "facility",
  appointment,
  size = "sm",
  className = "",
  onSuccess,
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Don't render if no appointment
  if (!appointment?.id) {
    return null;
  }

  const apptStatus = String(appointment.status || "").toUpperCase();
  const hasEncounter = !!(appointment.encounter_id || appointment.has_encounter);
  const encounterStatus = String(appointment.encounter_status || "").toUpperCase();

  // Terminal appointment statuses where we shouldn't show any button
  const TERMINAL_STATUSES = ["CANCELLED", "COMPLETED", "NO_SHOW"];
  if (TERMINAL_STATUSES.includes(apptStatus)) {
    return null;
  }

  // Don't show button if encounter is already closed
  if (hasEncounter && encounterStatus === "CLOSED") {
    return null;
  }

  // Determine button behavior
  const isNewEncounter = !hasEncounter;
  const isContinuing = hasEncounter;

  const handleClick = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      let encounterId;

      if (isNewEncounter) {
        // Start a new encounter
        const response = await apiFetch("/encounters/start-from-appointment/", {
          method: "POST",
          body: JSON.stringify({
            appointment_id: appointment.id,
          }),
        });

        encounterId = response?.id;

        if (!encounterId) {
          throw new Error("No encounter ID returned from server");
        }

        // Call success callback if provided
        if (onSuccess) {
          onSuccess(response);
        }
      } else {
        // Use existing encounter
        encounterId = appointment.encounter_id;

        if (onSuccess) {
          onSuccess({ id: encounterId });
        }
      }

      // Determine which workflow page to navigate to based on encounter status
      const basePath = scope === "provider" ? "/provider" : "/facility";
      
      if (encounterStatus === "WAITING_LABS") {
        // If waiting on labs, go to waiting-labs page
        router.push(`${basePath}/encounters/${encounterId}/workflow/waiting-labs`);
      } else if (encounterStatus === "IN_PROGRESS" || encounterStatus === "OPEN") {
        // For in-progress encounters, go to nurse workflow (doctors can proceed from there)
        router.push(`${basePath}/encounters/${encounterId}/workflow/nurse`);
      } else {
        // Default: start at nurse workflow
        router.push(`${basePath}/encounters/${encounterId}/workflow/nurse`);
      }
    } catch (err) {
      console.error("Failed to start/continue encounter:", err);
      alert(err?.message || "Failed to proceed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Size variants
  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
  };

  const buttonText = isLoading
    ? isContinuing
      ? "Opening…"
      : "Starting…"
    : isContinuing
    ? "Continue Encounter"
    : "Start Encounter";

  const icon = isLoading ? (
    <Loader2 className="h-3.5 w-3.5 animate-spin" />
  ) : isContinuing ? (
    <ArrowRight className="h-3.5 w-3.5" />
  ) : (
    <Stethoscope className="h-3.5 w-3.5" />
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${isContinuing ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"}
        text-white shadow-sm
        disabled:opacity-60 disabled:cursor-not-allowed
        transition-colors
        ${sizeClasses[size] || sizeClasses.sm}
        ${className}
      `}
      title={
        isContinuing
          ? `Continue to encounter #${appointment.encounter_id}`
          : "Start a new encounter for this appointment"
      }
    >
      {icon}
      <span>{buttonText}</span>
    </button>
  );
}

/**
 * A variant that shows as a link-styled button for detail pages
 */
export function StartEncounterLink({
  scope = "facility",
  appointment,
  className = "",
  onSuccess,
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  if (!appointment?.id) {
    return null;
  }

  const apptStatus = String(appointment.status || "").toUpperCase();
  const hasEncounter = !!(appointment.encounter_id || appointment.has_encounter);
  const encounterStatus = String(appointment.encounter_status || "").toUpperCase();

  const TERMINAL_STATUSES = ["CANCELLED", "COMPLETED", "NO_SHOW"];
  if (TERMINAL_STATUSES.includes(apptStatus)) {
    return null;
  }

  if (hasEncounter && encounterStatus === "CLOSED") {
    return null;
  }

  const isNewEncounter = !hasEncounter;
  const isContinuing = hasEncounter;

  const handleClick = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      let encounterId;

      if (isNewEncounter) {
        const response = await apiFetch("/encounters/start-from-appointment/", {
          method: "POST",
          body: JSON.stringify({
            appointment_id: appointment.id,
          }),
        });

        encounterId = response?.id;

        if (!encounterId) {
          throw new Error("No encounter ID returned from server");
        }

        if (onSuccess) {
          onSuccess(response);
        }
      } else {
        encounterId = appointment.encounter_id;

        if (onSuccess) {
          onSuccess({ id: encounterId });
        }
      }

      const basePath = scope === "provider" ? "/provider" : "/facility";
      
      if (encounterStatus === "WAITING_LABS") {
        router.push(`${basePath}/encounters/${encounterId}/workflow/waiting-labs`);
      } else {
        router.push(`${basePath}/encounters/${encounterId}/workflow/nurse`);
      }
    } catch (err) {
      console.error("Failed to start/continue encounter:", err);
      alert(err?.message || "Failed to proceed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const buttonText = isLoading
    ? isContinuing
      ? "Opening…"
      : "Starting…"
    : isContinuing
    ? "Continue Encounter"
    : "Start Encounter";

  const icon = isLoading ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : isContinuing ? (
    <ArrowRight className="h-4 w-4" />
  ) : (
    <Stethoscope className="h-4 w-4" />
  );

  const colorClass = isContinuing ? "text-blue-700 hover:text-blue-800" : "text-emerald-700 hover:text-emerald-800";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={`
        inline-flex items-center gap-2 ${colorClass}
        font-medium disabled:opacity-60 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {icon}
      <span>{buttonText}</span>
    </button>
  );
}