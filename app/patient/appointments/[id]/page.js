"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import {
  CalendarRange,
  Stethoscope,
  Building2,
  Clock,
  FileText,
  Link2,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import {
  postAppointmentAction,
  TERMINAL_STATUSES,
} from "@/lib/appointmentsActions";

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

function isTerminalStatus(status) {
  const normalized = (status || "").toUpperCase();
  return (TERMINAL_STATUSES || ["COMPLETED", "CANCELLED", "NO_SHOW"]).includes(normalized);
}

export default function PatientAppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch appointment data
  const fetchAppointment = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch(`/appointments/${id}/`);
      setAppt(data);
    } catch (err) {
      console.error("Failed to load appointment", err);
      setError(err?.message || "Failed to load appointment details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAction = async (action) => {
    if (!id) return;
    try {
      setActionLoading(true);
      await postAppointmentAction(id, action);
      await fetchAppointment(); // Refresh data
    } catch (err) {
      console.error("Failed to perform action", err);
      alert(err?.message || `Failed to ${action} appointment.`);
    } finally {
      setActionLoading(false);
    }
  };

  if (!id) {
    return (
      <main className="mx-auto max-w-4xl p-6 md:p-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Missing appointment ID in URL.
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-6 md:p-10">
        <h1 className="text-2xl font-semibold text-slate-900">Appointment</h1>
        <p className="mt-2 text-slate-600">Loading...</p>
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
          href="/patient/appointments"
          className="mt-6 inline-flex items-center gap-2 text-blue-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to appointments
        </Link>
      </main>
    );
  }

  const provider = appt.provider_name || appt.provider?.full_name || appt.provider?.name || "Provider";
  const facility = appt.facility_name || appt.facility?.name || "—";
  const reason = appt.reason || appt.visit_reason || "Consultation";
  const status = (appt.status || "scheduled").toUpperCase();
  const start = appt.start_at || appt.start_time || appt.time || "—";
  const end = appt.end_at || appt.end_time || "—";

  // Status flags
  const isFinal = isTerminalStatus(status);
  const canCancel = status === "SCHEDULED" && !isFinal;

  // Encounter info from backend
  const hasEncounter = appt.has_encounter || !!appt.encounter_id;
  const encounterStatus = appt.encounter_status || null;
  const encounterId = appt.encounter_id || null;

  // Available actions from backend (for patients, typically just "cancel" for SCHEDULED)
  const availableActions = Array.isArray(appt.available_actions)
    ? appt.available_actions
    : canCancel
    ? ["cancel"]
    : [];

  return (
    <main className="mx-auto max-w-6xl p-6 md:p-10 space-y-6">
      {/* Header */}
      <header className="mb-2">
        <button
          type="button"
          onClick={() => router.push("/patient/appointments")}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to appointments
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700 mb-2">
              <CalendarRange className="h-3.5 w-3.5" />
              Appointment #{appt.id || id}
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              {reason}
            </h1>
            <p className="mt-1 text-sm text-slate-600">Patient view</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <StatusBadge value={status} />
            {isFinal && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Final - No further actions
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Appointment Details */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Appointment Details
          </h2>
          <dl className="grid grid-cols-3 gap-y-4 text-sm">
            <dt className="text-slate-600 flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-slate-400" />
              Provider
            </dt>
            <dd className="col-span-2 text-slate-900 font-medium">{provider}</dd>

            <dt className="text-slate-600 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              Facility
            </dt>
            <dd className="col-span-2 text-slate-900">{facility}</dd>

            <dt className="text-slate-600 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              Reason
            </dt>
            <dd className="col-span-2 text-slate-900">{reason}</dd>

            <dt className="text-slate-600 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              Start
            </dt>
            <dd className="col-span-2 text-slate-900">{formatDateTime(start)}</dd>

            <dt className="text-slate-600">End</dt>
            <dd className="col-span-2 text-slate-900">{formatDateTime(end)}</dd>
          </dl>
        </section>

        {/* Encounter Link Section */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Link2 className="h-5 w-5 text-slate-400" />
            Encounter
          </h2>

          {hasEncounter ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  <Link2 className="h-3 w-3" />
                  Linked
                </span>
                {encounterStatus && (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    {encounterStatus}
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-600">
                This appointment is linked to an encounter record. Your provider
                has documented notes from your visit.
              </p>

              {encounterId && (
                <Link
                  href={`/patient/encounters/${encounterId}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  View encounter details
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">
                No encounter linked yet.
              </p>
              {!isFinal && (
                <p className="text-xs text-slate-400">
                  An encounter will be created when your provider starts your visit.
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Notes Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Notes</h2>
        <p className="text-sm text-slate-700 whitespace-pre-wrap">
          {appt.patient_note || appt.notes || "No notes provided."}
        </p>
      </section>

      {/* Actions Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Actions</h2>

        {isFinal ? (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <AlertCircle className="h-5 w-5 text-slate-400" />
            <span>
              This appointment is <strong>{status.toLowerCase()}</strong>. No further
              actions are available.
            </span>
          </div>
        ) : availableActions.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {availableActions.includes("cancel") && (
              <button
                type="button"
                onClick={() => handleAction("cancel")}
                disabled={actionLoading}
                className="inline-flex items-center rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                {actionLoading ? "Cancelling..." : "Cancel Appointment"}
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No actions available for this appointment status.
          </p>
        )}
      </section>
    </main>
  );
}
