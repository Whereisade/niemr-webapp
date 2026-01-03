// app/facility/appointments/new/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { APPT_TYPES, createAppointment } from "@/lib/appointmentsActions";
import { apiFetch } from "@/lib/api";
import {
  CalendarRange,
  Clock,
  UsersRound,
  Stethoscope,
  Mail,
  ArrowLeft,
} from "lucide-react";

function combineDateTime(date, time) {
  if (!date || !time) return null;
  const iso = `${date}T${time}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function FacilityNewAppointmentPage() {
  const router = useRouter();

  // Form state
  const [patientId, setPatientId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [apptType, setApptType] = useState("CONSULT");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationMins, setDurationMins] = useState("30");
  const [reason, setReason] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Dropdown data
  const [patients, setPatients] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchPatients() {
      try {
        setLoadingPatients(true);
        const res = await apiFetch("/patients/?page=1&limit=50");
        if (cancelled) return;
        const items = Array.isArray(res) ? res : res?.results || [];
        setPatients(items);
      } catch (err) {
        console.error("Failed to load patients", err);
        if (!cancelled) setPatients([]);
      } finally {
        if (!cancelled) setLoadingPatients(false);
      }
    }

    async function fetchProviders() {
      try {
        setLoadingProviders(true);
        const res = await apiFetch(
          "/providers/?facility=current&type=DOCTOR&page=1&limit=50"
        );

        if (cancelled) return;
        const items = Array.isArray(res) ? res : res?.results || [];
        setProviders(items);
      } catch (err) {
        console.error("Failed to load providers", err);
        if (!cancelled) setProviders([]);
      } finally {
        if (!cancelled) setLoadingProviders(false);
      }
    }

    fetchPatients();
    fetchProviders();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const patient = Number(patientId);
    if (!patient || Number.isNaN(patient)) {
      setError("Please select a patient.");
      return;
    }

    const startAt = combineDateTime(date, time);
    if (!startAt) {
      setError("Please enter a valid date & time.");
      return;
    }

    const dur = Number(durationMins) || 30;
    const startDate = new Date(startAt);
    const endDate = new Date(startDate.getTime() + dur * 60 * 1000);
    const endAt = endDate.toISOString();

    const payload = {
      patient,
      appt_type: apptType,
      start_at: startAt,
      end_at: endAt,
    };

    const provider = Number(providerId);
    if (provider && !Number.isNaN(provider)) {
      // now sending the User id (p.user) thanks to the select value
      payload.provider = provider;
    }

    if (reason.trim()) payload.reason = reason.trim();
    payload.notify_email = !!sendEmail;
    setIsSubmitting(true);
    try {
      await createAppointment(payload);
      router.push("/facility/appointments");
    } catch (err) {
      console.error("Create appointment failed", err);
      setError(
        err?.message ||
          "Failed to create appointment. Please check the fields and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    !isSubmitting &&
    !!patientId &&
    !!date &&
    !!time &&
    !loadingPatients &&
    patients.length > 0;

  const selectedPatient = patients.find(
    (p) => String(p.id) === String(patientId)
  );

  // 🔹 Use p.user (User id) instead of profile id
  const selectedProvider = providers.find(
    (p) => String(p.user) === String(providerId)
  );

  const patientName = selectedPatient
    ? [selectedPatient.first_name, selectedPatient.last_name]
        .filter(Boolean)
        .join(" ")
    : "";
  const providerName = selectedProvider
    ? [selectedProvider.first_name, selectedProvider.last_name]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <main className="relative mx-auto max-w-5xl p-6 md:p-10 space-y-6">
      {/* soft background accents to match dashboards */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100 blur-3xl opacity-60" />

      {/* Header */}
      <header className="mb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <CalendarRange className="h-3.5 w-3.5" />
            Facility · New Appointment
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Schedule a facility visit
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Choose a patient, optionally assign a provider, and block out the
            appointment slot.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/facility/appointments")}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to schedule
        </button>
      </header>

      {/* Form + side rail */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <form
          onSubmit={handleSubmit}
          className="space-y-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

          <div className="space-y-6 p-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Patient select */}
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                <UsersRound className="h-4 w-4 text-slate-500" />
                Patient
              </label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">
                  {loadingPatients
                    ? "Loading patients…"
                    : patients.length
                    ? "Select patient"
                    : "No patients found"}
                </option>
                {!loadingPatients &&
                  patients.map((p) => {
                    const fullName = [p.first_name, p.last_name]
                      .filter(Boolean)
                      .join(" ");
                    const label = fullName || p.email || `Patient #${p.id}`;
                    return (
                      <option key={p.id} value={String(p.id)}>
                        {label}
                      </option>
                    );
                  })}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Patients are limited to those visible to this facility.
              </p>
            </div>

            {/* Provider select (optional) */}
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Stethoscope className="h-4 w-4 text-slate-500" />
                Provider (optional)
              </label>
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">
                  {loadingProviders
                    ? "Loading providers…"
                    : "Unassigned"}
                </option>
                {!loadingProviders &&
                  providers.map((p) => (
                    <option key={p.id} value={String(p.user)}>
                      {[
                        p.first_name,
                        p.last_name,
                      ]
                        .filter(Boolean)
                        .join(" ") || p.email || `Provider #${p.id}`}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Leave blank to allow the facility to assign a provider later.
              </p>
            </div>

            {/* Appointment type */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Appointment type
              </label>
              <select
                value={apptType}
                onChange={(e) => setApptType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {APPT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date / time / duration */}
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <CalendarRange className="h-4 w-4 text-slate-500" />
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Clock className="h-4 w-4 text-slate-500" />
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={durationMins}
                  onChange={(e) => setDurationMins(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Used to calculate the automatic end time.
                </p>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Reason (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Short description of why this appointment is being scheduled."
              />
              <p className="mt-1 text-xs text-slate-500">
                This helps other staff understand the context at a glance.
              </p>
            </div>

            {/* Email notifications */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Mail className="h-4 w-4 text-slate-500" />
                Email notifications
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={!!sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
                Send email notifications (reminders/updates) to the patient’s account email
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Emails are sent to the patient\'s registered email (custom emails are not supported).
              </p>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={() => router.push("/facility/appointments")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={isSubmitting}
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? "Creating…" : "Create appointment"}
            </button>
          </div>
        </form>

        {/* Right rail: summary + tips */}
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500/70 via-teal-500/70 to-cyan-500/70" />
            <div className="p-5 text-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Appointment summary
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Quick overview of what you&apos;re about to schedule.
              </p>

              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Patient</dt>
                  <dd className="text-right text-slate-900">
                    {patientName || "Not selected"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Provider</dt>
                  <dd className="text-right text-slate-900">
                    {providerName || "Any available"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Date</dt>
                  <dd className="text-right text-slate-900">
                    {date || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Time</dt>
                  <dd className="text-right text-slate-900">
                    {time || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Duration</dt>
                  <dd className="text-right text-slate-900">
                    {durationMins ? `${durationMins} mins` : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <h3 className="mb-1 text-xs font-semibold text-slate-900">
              Scheduling tips
            </h3>
            <ul className="list-disc space-y-1 pl-4">
              <li>Try to avoid overlapping slots for the same provider.</li>
              <li>Use the reason field to call out urgent or walk-in cases.</li>
              <li>
                If you don&apos;t know the provider yet, leave it blank and let
                the front desk assign later.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}