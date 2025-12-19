"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import StartEncounterButton from "@/components/encounters/StartEncounterButton";
import {
  postAppointmentAction,
  getAvailableActions,
  APPT_ACTION_LABELS,
  canStartEncounter,
  TERMINAL_STATUSES,
} from "@/lib/appointmentsActions";
import {
  CalendarRange,
  Users2,
  Stethoscope,
  Building2,
  Clock,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";

function formatDateTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

export default function ProviderAppointmentDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadAppointment() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch(`/appointments/${id}/`);
        if (!cancelled) {
          setAppt(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load appointment");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAppointment();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleAction = async (action) => {
    if (!appt?.id || actionLoading) return;

    setActionLoading(action);
    try {
      await postAppointmentAction(appt.id, action);
      // Refresh appointment data
      const refreshed = await apiFetch(`/appointments/${appt.id}/`);
      setAppt(refreshed);
    } catch (err) {
      alert(err?.message || "Failed to update appointment status.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-6 md:p-10">
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading appointment…</span>
        </div>
      </main>
    );
  }

  if (error || !appt) {
    return (
      <main className="mx-auto max-w-4xl p-6 md:p-10">
        <h1 className="text-2xl font-semibold text-slate-900">Appointment</h1>
        <p className="mt-2 text-slate-600">
          {error || "Not found or you don't have access."}
        </p>
        <Link
          href="/provider/appointments"
          className="mt-6 inline-flex items-center gap-2 text-blue-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to appointments
        </Link>
      </main>
    );
  }

  const patient =
    appt.patient_name ||
    appt.patient?.full_name ||
    appt.patient?.name ||
    "Patient";
  const facility = appt.facility_name || appt.facility?.name || "—";
  const reason = appt.reason || appt.visit_reason || "Consultation";
  const status = (appt.status || "SCHEDULED").toUpperCase();
  const start = appt.start_at || appt.start_time || appt.time || "—";
  const end = appt.end_at || appt.end_time || "—";

  const isTerminal = TERMINAL_STATUSES.includes(status);
  const showStartEncounter =
    typeof appt.can_start_encounter === "boolean"
      ? appt.can_start_encounter
      : canStartEncounter(appt);

  const actions = Array.isArray(appt.available_actions)
    ? appt.available_actions
    : getAvailableActions(status, {
        hasEncounter: appt.has_encounter || !!appt.encounter_id,
        encounterStatus: appt.encounter_status,
      });

  return (
    <main className="mx-auto max-w-6xl p-6 md:p-10">
      {/* Header */}
      <header className="mb-8">
        <Link
          href="/provider/appointments"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to appointments
        </Link>

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700 mb-2">
              <CalendarRange className="h-3.5 w-3.5" />
              Provider · Appointment #{appt.id || id}
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              {reason}
            </h1>
          </div>
          <StatusBadge value={status} />
        </div>
      </header>

      {/* Main content */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Details card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Appointment Details
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Users2 className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">
                  Patient
                </dt>
                <dd className="text-slate-900 font-medium">{patient}</dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">
                  Facility
                </dt>
                <dd className="text-slate-900 font-medium">{facility}</dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">
                  Time
                </dt>
                <dd className="text-slate-900">
                  <div>{formatDateTime(start)}</div>
                  <div className="text-slate-500">to {formatDateTime(end)}</div>
                </dd>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <dt className="text-slate-500 text-xs uppercase tracking-wide mb-1">
                Type
              </dt>
              <dd className="text-slate-900">{appt.appt_type || "Consult"}</dd>
            </div>
          </dl>
        </div>

        {/* Notes & Encounter card */}
        <div className="space-y-6">
          {/* Notes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Notes</h2>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {appt.notes || appt.summary || "No notes recorded."}
            </p>
          </div>

          {/* Encounter info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              Encounter
            </h2>
            {appt.encounter_id || appt.has_encounter ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                    Linked to Encounter #{appt.encounter_id}
                  </span>
                </div>
                {appt.encounter_status && (
                  <div className="text-sm text-slate-600">
                    Status:{" "}
                    <span className="font-medium">{appt.encounter_status}</span>
                  </div>
                )}
                <Link
                  href={`/provider/encounters/${appt.encounter_id}`}
                  className="inline-flex items-center gap-2 text-sm text-blue-700 hover:underline"
                >
                  <Stethoscope className="h-4 w-4" />
                  View encounter details
                </Link>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No encounter has been started for this appointment yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Actions</h2>

        {isTerminal ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <AlertCircle className="h-4 w-4" />
            <span>
              This appointment is in a final state ({status.toLowerCase()}) and
              cannot be modified.
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {/* Start Encounter button */}
            {showStartEncounter && (
              <StartEncounterButton
                scope="provider"
                appointment={appt}
                size="md"
                onSuccess={(enc) => {
                  // Refresh appointment to get updated encounter_id
                  apiFetch(`/appointments/${appt.id}/`).then(setAppt);
                }}
              />
            )}

            {/* Status transition actions */}
            {actions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => handleAction(action)}
                disabled={actionLoading === action}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
              >
                {actionLoading === action && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {APPT_ACTION_LABELS[action] || action}
              </button>
            ))}

            {actions.length === 0 && !showStartEncounter && (
              <p className="text-sm text-slate-500">
                No actions available for this appointment.
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
