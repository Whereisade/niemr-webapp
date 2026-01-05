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
  getAppointmentTypeLabel,
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
  CreditCard,
  CheckCircle2,
  XCircle,
  DollarSign,
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

function formatMoney(v) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `₦${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function FacilityAppointmentDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionSuccess, setActionSuccess] = useState("");

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
    setActionSuccess("");
    try {
      const updated = await postAppointmentAction(appt.id, action);
      
      // Show billing info if check-in created a charge
      if (action === "check_in" && updated.charge_created) {
        setActionSuccess(
          `Patient checked in successfully! Billing charge #${updated.charge_id} created for ${formatMoney(updated.charge_amount)}`
        );
      } else if (action === "check_in" && updated.charge_error) {
        setActionSuccess(
          `Patient checked in, but billing charge failed: ${updated.charge_error}`
        );
      }
      
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
          href="/facility/appointments"
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
  const provider =
    appt.provider_name ||
    appt.provider?.full_name ||
    appt.provider?.name ||
    "Unassigned";
  const facility =
    appt.facility_name || appt.facility?.name || "—";
  const reason = appt.reason || appt.visit_reason || "Consultation";
  const status = (appt.status || "SCHEDULED").toUpperCase();
  const start = appt.start_at || appt.start_time || appt.time || "—";
  const end = appt.end_at || appt.end_time || "—";
  const apptTypeLabel = getAppointmentTypeLabel(appt.appt_type);

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
          href="/facility/appointments"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to appointments
        </Link>

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700 mb-2">
              <CalendarRange className="h-3.5 w-3.5" />
              Facility · Appointment #{appt.id || id}
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              {reason}
            </h1>
          </div>
          <StatusBadge value={status} />
        </div>
      </header>

      {/* Success message */}
      {actionSuccess && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
            <p className="text-sm text-emerald-800">{actionSuccess}</p>
          </div>
        </div>
      )}

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
              <Stethoscope className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">
                  Provider
                </dt>
                <dd className="text-slate-900 font-medium">{provider}</dd>
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
              <dd className="text-slate-900 font-medium">{apptTypeLabel}</dd>
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
                  href={`/facility/encounters/${appt.encounter_id}`}
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

      {/* Billing Information */}
      {(appt.charge_id || appt.linked_charge_id) && (
        <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100">
                <CreditCard className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Billing Charge</h2>
                <p className="text-sm text-emerald-700 mt-1">
                  Automatically created on check-in
                </p>
              </div>
            </div>
            <Link
              href="/facility/billing"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              <DollarSign className="h-4 w-4" />
              View in Billing
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-white p-4">
              <div className="text-xs font-medium text-emerald-700 mb-1">Charge ID</div>
              <div className="text-lg font-bold text-slate-900">
                #{appt.charge_id || appt.linked_charge_id}
              </div>
            </div>
            
            {appt.charge_amount && (
              <div className="rounded-xl border border-emerald-200 bg-white p-4">
                <div className="text-xs font-medium text-emerald-700 mb-1">Amount</div>
                <div className="text-lg font-bold text-slate-900">
                  {formatMoney(appt.charge_amount)}
                </div>
              </div>
            )}
            
            <div className="rounded-xl border border-emerald-200 bg-white p-4">
              <div className="text-xs font-medium text-emerald-700 mb-1">Service</div>
              <div className="text-sm font-medium text-slate-900">{apptTypeLabel}</div>
              <div className="text-xs text-slate-500 mt-1">APPT:{appt.appt_type}</div>
            </div>
          </div>
        </section>
      )}

      {/* Billing error */}
      {appt.charge_error && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900">Billing Issue</h3>
              <p className="text-sm text-amber-800 mt-1">{appt.charge_error}</p>
              <p className="text-xs text-amber-700 mt-2">
                The patient was checked in successfully, but the automatic billing charge could not be created. 
                You can manually create a charge in the Billing section.
              </p>
            </div>
          </div>
        </section>
      )}

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
                scope="facility"
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
                {action === "check_in" && <CreditCard className="h-4 w-4" />}
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