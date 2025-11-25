"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { APPT_TYPES, createAppointment } from "@/lib/appointmentsActions";
import { apiFetch } from "@/lib/api";
import {
  CalendarRange,
  Clock,
  UsersRound,
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

export default function ProviderNewAppointmentPage() {
  const router = useRouter();

  // Form state
  const [patientId, setPatientId] = useState("");
  const [apptType, setApptType] = useState("CONSULT");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationMins, setDurationMins] = useState("30");
  const [reason, setReason] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Dropdown data
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchPatients() {
      try {
        setLoadingPatients(true);
        // simple paginated list; later we can filter to facility
        const res = await apiFetch("/patients/?page=1&limit=50");
        if (cancelled) return;
        const items = Array.isArray(res) ? res : res?.results || [];
        setPatients(items);
      } catch (err) {
        console.error("Failed to load patients", err);
        if (!cancelled) {
          setPatients([]);
        }
      } finally {
        if (!cancelled) setLoadingPatients(false);
      }
    }

    fetchPatients();

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

    if (reason.trim()) payload.reason = reason.trim();
    if (notifyEmail.trim()) payload.notify_email = notifyEmail.trim();

    setIsSubmitting(true);
    try {
      await createAppointment(payload);
      router.push("/provider/appointments");
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
  const selectedName = selectedPatient
    ? [selectedPatient.first_name, selectedPatient.last_name]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <main className="relative mx-auto max-w-5xl p-6 md:p-10 space-y-6">
      {/* soft background accents for parity with other provider pages */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100 blur-3xl opacity-60" />

      {/* Header */}
      <header className="mb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <CalendarRange className="h-3.5 w-3.5" />
            Provider · New Appointment
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Schedule a visit
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Pick a patient, choose the slot, and optionally add a brief reason
            or email notification.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/provider/appointments")}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to appointments
        </button>
      </header>

      {/* Form + side rail */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <form
          onSubmit={handleSubmit}
          className="space-y-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

          <div className="p-6 space-y-6">
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
                Patients are limited to those visible to your account.
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
                  Used to calculate the end time automatically.
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
                This helps other staff quickly understand the context of the visit.
              </p>
            </div>

            {/* Notify email */}
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Mail className="h-4 w-4 text-slate-500" />
                Notify email (optional)
              </label>
              <input
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="patient@example.com"
              />
              <p className="mt-1 text-xs text-slate-500">
                If provided, we’ll send appointment details to this address.
              </p>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={() => router.push("/provider/appointments")}
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

        {/* Right rail: context card */}
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500/70 via-teal-500/70 to-cyan-500/70" />
            <div className="p-5 text-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Appointment summary
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Quick overview of the details you&apos;ve selected.
              </p>

              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Patient</dt>
                  <dd className="text-right text-slate-900">
                    {selectedName || "Not selected"}
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
              Tips
            </h3>
            <ul className="space-y-1 list-disc pl-4">
              <li>Use clear, concise reasons to help triage.</li>
              <li>Confirm contact details before adding notify email.</li>
              <li>
                If you need recurring visits, create this one first, then clone
                it from the appointment details screen.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
