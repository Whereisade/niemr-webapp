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
  Building2,
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
  const [apptType, setApptType] = useState("CONSULTATION");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationMins, setDurationMins] = useState("30");
  const [reason, setReason] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Dropdown data
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [facilityId, setFacilityId] = useState("");

  // Check if user is facility-based or independent
  const isFacilityBased = Boolean(me?.facility_id || me?.facility);
  const userFacilityId = me?.facility_id || me?.facility?.id || me?.facility;

  useEffect(() => {
    let cancelled = false;

    async function fetchMe() {
      try {
        setLoadingMe(true);
        const meData = await apiFetch("/accounts/me/");
        if (cancelled) return;
        setMe(meData);
        
        // Auto-set facility for facility-based providers only
        if (meData?.facility_id || meData?.facility) {
          const facId = meData.facility_id || meData.facility?.id || meData.facility;
          setFacilityId(String(facId));
        }
      } catch (err) {
        console.error("Failed to load me", err);
      } finally {
        if (!cancelled) setLoadingMe(false);
      }
    }

    async function fetchPatients() {
      try {
        setLoadingPatients(true);
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

    fetchMe();
    fetchPatients();

    return () => {
      cancelled = true;
    };
  }, []);

  // Derive selectedPatient from patientId and patients list
  const selectedPatient = patients.find(
    (p) => String(p.id) === String(patientId)
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const patient = Number(patientId);
    if (!patient || Number.isNaN(patient)) {
      setError("Please select a patient.");
      return;
    }

    if (!me?.id) {
      setError("Could not determine the logged-in provider. Please re-login.");
      return;
    }

    // Facility-based providers must have facility
    if (isFacilityBased && !facilityId) {
      setError("Facility is required for facility-based providers.");
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
      patient: selectedPatient?.id,
      appt_type: apptType,
      start_at: startAt,
      end_at: endAt,
      reason: reason.trim() || "",
      // Facility-based providers: include facility (required)
      // Independent providers: NO facility - provider-only appointments
      ...(isFacilityBased ? { facility: Number(facilityId) } : {}),
      // Provider is always the logged-in user
      provider: me?.id,
      // Backend expects a boolean
      notify_email: !!sendEmail,
    };

    // remove undefined keys
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    
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

  const selectedName = selectedPatient
    ? [selectedPatient.first_name, selectedPatient.last_name]
        .filter(Boolean)
        .join(" ")
    : "";

  // Get facility name for display
  const facilityName = isFacilityBased
    ? me?.facility?.name || "Your facility"
    : selectedPatient?.facility?.name || "—";

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
            {isFacilityBased 
              ? "Book a patient appointment at your facility." 
              : "Book a patient appointment directly with you as the provider."}
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

            {/* Role-based facility display - ONLY for facility-based providers */}
            {isFacilityBased && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                  <Building2 className="h-4 w-4" />
                  Facility
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-900 border border-slate-200">
                    {me?.facility?.name || "Your facility"}
                  </span>
                  <span className="text-xs text-slate-500">(Auto-set)</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  All your appointments are automatically created at your facility.
                </p>
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

              {/* <div>
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
              </div> */}
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
                Send email notifications (reminders/updates) to the patient's account email
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Emails are sent to the patient's registered email (custom emails are not supported).
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
                  <dt className="text-slate-500">Provider type</dt>
                  <dd className="text-right text-slate-900">
                    {isFacilityBased ? "Facility-based" : "Independent"}
                  </dd>
                </div>
                {isFacilityBased && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Facility</dt>
                    <dd className="text-right text-slate-900">
                      {me?.facility?.name || "Your facility"}
                    </dd>
                  </div>
                )}
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
                {/* <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Duration</dt>
                  <dd className="text-right text-slate-900">
                    {durationMins ? `${durationMins} mins` : "—"}
                  </dd>
                </div> */}
              </dl>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <h3 className="mb-1 text-xs font-semibold text-slate-900">
              {isFacilityBased ? "Facility-based booking" : "Solo Practitioner booking"}
            </h3>
            {isFacilityBased ? (
              <ul className="space-y-1 list-disc pl-4">
                <li>All appointments are created at your facility.</li>
                <li>Patient billing is managed by your facility.</li>
                <li>Use clear, concise reasons to help with triage.</li>
              </ul>
            ) : (
              <ul className="space-y-1 list-disc pl-4">
                <li>You operate independently</li>
                <li>Consider scheduling follow-ups before patients leave.</li>
                <li>Use clear reasons to help manage your own patient flow.</li>
              </ul>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}