"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { canStartEncounter, TERMINAL_STATUSES } from "@/lib/appointmentsActions";
import { Stethoscope, Loader2 } from "lucide-react";

/**
 * Button to start an encounter from an appointment.
 *
 * Props:
 * - scope: "facility" | "provider" - determines redirect path
 * - appointment: appointment object with id, status, encounter_id, etc.
 * - size: "sm" | "md" (default "sm")
 * - className: additional CSS classes
 * - onSuccess: callback after successful encounter creation
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
  const [error, setError] = useState(null);

  // Don't render if no appointment
  if (!appointment?.id) {
    return null;
  }

  // Check if we can start an encounter
  // Use backend-computed value if available, otherwise calculate locally
  const canStart =
    typeof appointment.can_start_encounter === "boolean"
      ? appointment.can_start_encounter
      : canStartEncounter(appointment);

  // Don't render if can't start
  if (!canStart) {
    return null;
  }

  const handleStartEncounter = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch("/encounters/start-from-appointment/", {
        method: "POST",
        body: JSON.stringify({
          appointment_id: appointment.id,
        }),
      });

      const encounterId = response?.id;

      if (!encounterId) {
        throw new Error("No encounter ID returned from server");
      }

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(response);
      }

      // Navigate to the encounter workflow
      const basePath = scope === "provider" ? "/provider" : "/facility";
      router.push(`${basePath}/encounters/${encounterId}/workflow/labs`);
    } catch (err) {
      console.error("Failed to start encounter:", err);
      setError(err?.message || "Failed to start encounter. Please try again.");

      // Show error via alert if no other error handling
      alert(err?.message || "Failed to start encounter. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Size variants
  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
  };

  return (
    <button
      type="button"
      onClick={handleStartEncounter}
      disabled={isLoading}
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        bg-emerald-600 text-white shadow-sm
        hover:bg-emerald-700 
        disabled:opacity-60 disabled:cursor-not-allowed
        transition-colors
        ${sizeClasses[size] || sizeClasses.sm}
        ${className}
      `}
      title={
        appointment.encounter_id
          ? "Continue to existing encounter"
          : "Start a new encounter for this appointment"
      }
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Stethoscope className="h-3.5 w-3.5" />
      )}
      <span>
        {isLoading
          ? "Starting…"
          : appointment.encounter_id
          ? "Continue Encounter"
          : "Start Encounter"}
      </span>
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

  const canStart =
    typeof appointment.can_start_encounter === "boolean"
      ? appointment.can_start_encounter
      : canStartEncounter(appointment);

  if (!canStart) {
    return null;
  }

  const handleStartEncounter = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const response = await apiFetch("/encounters/start-from-appointment/", {
        method: "POST",
        body: JSON.stringify({
          appointment_id: appointment.id,
        }),
      });

      const encounterId = response?.id;

      if (!encounterId) {
        throw new Error("No encounter ID returned from server");
      }

      if (onSuccess) {
        onSuccess(response);
      }

      const basePath = scope === "provider" ? "/provider" : "/facility";
      router.push(`${basePath}/encounters/${encounterId}/workflow/labs`);
    } catch (err) {
      console.error("Failed to start encounter:", err);
      alert(err?.message || "Failed to start encounter. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleStartEncounter}
      disabled={isLoading}
      className={`
        inline-flex items-center gap-2 text-emerald-700 hover:text-emerald-800
        font-medium disabled:opacity-60 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Stethoscope className="h-4 w-4" />
      )}
      <span>
        {isLoading
          ? "Starting…"
          : appointment.encounter_id
          ? "Continue Encounter"
          : "Start Encounter"}
      </span>
    </button>
  );
}
