"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { createEncounter } from "@/lib/encounterActions";
import { PlayCircle, ExternalLink, Loader2 } from "lucide-react";

function pickFirst(...values) {
  for (const v of values) {
    if (v === 0) return v;
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}

function toISO(value) {
  if (!value) return null;
  // If it's already ISO-ish, just pass through.
  if (typeof value === "string" && value.includes("T")) return value;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

function buildAppointmentLinkPayload(appt, encounterId) {
  const start = pickFirst(
    appt?.start_at,
    appt?.start_time,
    appt?.scheduled_for,
    appt?.date,
    appt?.time
  );
  const end = pickFirst(appt?.end_at, appt?.end_time, appt?.end);

  // The backend AppointmentUpdateSerializer.validate() currently requires
  // start_at and end_at even on PATCH, so we include them.
  const payload = {
    patient: appt?.patient,
    provider: appt?.provider ?? null,
    appt_type: pickFirst(appt?.appt_type, appt?.type, "CONSULT"),
    reason: appt?.reason ?? "",
    notes: appt?.notes ?? "",
    start_at: start,
    end_at: end,
    encounter_id: encounterId,
  };

  // Facility is read-only on update, but the backend validate() can still
  // use initial_data['facility'] when the staff user has no facility.
  if (appt?.facility) payload.facility = appt.facility;

  return payload;
}

/**
 * Start (or open) an encounter from an appointment.
 *
 * - If appointment.encounter_id exists: opens the encounter workflow.
 * - Else: creates an encounter (patient + occurred_at), then links the appointment.
 */
export default function StartEncounterButton({
  scope = "facility", // "facility" | "provider"
  appointment,
  className = "",
  size = "sm", // "sm" | "md"
}) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const encounterId = appointment?.encounter_id;

  const label = encounterId ? "Open encounter" : "Start encounter";
  const Icon = encounterId ? ExternalLink : PlayCircle;

  const btnClass = useMemo(() => {
    const base =
      "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white font-semibold text-slate-800 hover:border-blue-200 hover:text-blue-700 disabled:opacity-60";
    const pad = size === "md" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs";
    return [base, pad, className].join(" ");
  }, [className, size]);

  async function goToEncounter(encId) {
    const base = scope === "provider" ? "/provider" : "/facility";
    router.push(`${base}/encounters/${encId}/workflow/labs`);
  }

  async function handleClick() {
    if (!appointment?.id) return;

    setError("");

    if (encounterId) {
      await goToEncounter(encounterId);
      return;
    }

    setStarting(true);
    try {
      const occurredAtRaw = pickFirst(
        appointment?.start_at,
        appointment?.start_time,
        appointment?.scheduled_for,
        appointment?.date,
        appointment?.time
      );

      const occurred_at = toISO(occurredAtRaw) || new Date().toISOString();

      const encounterPayload = {
        patient: appointment?.patient,
        facility: appointment?.facility || undefined,
        occurred_at,
        chief_complaint: appointment?.reason || "",
      };

      if (!encounterPayload.patient) {
        throw new Error("This appointment is missing a patient id.");
      }

      const created = await createEncounter(encounterPayload);
      const newId = created?.id || created?.pk;
      if (!newId) {
        throw new Error("Encounter was created but no id was returned.");
      }

      // Best effort: link appointment.encounter_id to the created encounter.
      // (Backend validate() requires start_at + end_at on PATCH.)
      try {
        const linkPayload = buildAppointmentLinkPayload(appointment, newId);
        await apiFetch(`/appointments/${appointment.id}/`, {
          method: "PATCH",
          body: JSON.stringify(linkPayload),
        });
      } catch (e) {
        // If linking fails, still continue to the encounter.
        console.warn("Failed to link appointment to encounter", e);
      }

      await goToEncounter(newId);
    } catch (err) {
      setError(err?.message || "Failed to start encounter.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={starting}
        className={btnClass}
      >
        {starting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
        {label}
      </button>
      {error ? (
        <div className="max-w-[220px] text-right text-[11px] text-rose-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
