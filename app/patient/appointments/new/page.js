"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { APPT_TYPES, createAppointment } from "@/lib/appointmentsActions";
import { apiFetch } from "@/lib/api";
import {
  CalendarRange,
  Clock,
  Stethoscope,
  Building2,
  Mail,
  ArrowLeft,
  Info,
} from "lucide-react";

function combineDateTime(date, time) {
  if (!date || !time) return null;
  const iso = `${date}T${time}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function PatientNewAppointmentPage() {
  const router = useRouter();

  // Form state
  const [apptType, setApptType] = useState("CONSULT");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationMins, setDurationMins] = useState("30");
  const [providerId, setProviderId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [reason, setReason] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Dropdown data
  const [providers, setProviders] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingFacilities, setLoadingFacilities] = useState(true);

  // Load providers + facilities once on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchProviders() {
      try {
        setLoadingProviders(true);
        const res = await apiFetch("/providers/?page=1&limit=50");
        if (cancelled) return;
        const items = Array.isArray(res) ? res : res?.results || [];
        setProviders(items);
      } catch (err) {
        console.error("Failed to load providers", err);
        if (!cancelled) {
          setProviders([]);
        }
      } finally {
        if (!cancelled) setLoadingProviders(false);
      }
    }

    async function fetchFacilities() {
      try {
        setLoadingFacilities(true);
        const res = await apiFetch("/facilities/?page=1&limit=50");
        if (cancelled) return;
        const items = Array.isArray(res) ? res : res?.results || [];
        setFacilities(items);
      } catch (err) {
        console.error("Failed to load facilities", err);
        if (!cancelled) {
          setFacilities([]);
        }
      } finally {
        if (!cancelled) setLoadingFacilities(false);
      }
    }

    fetchProviders();
    fetchFacilities();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const startAt = combineDateTime(date, time);
    if (!startAt) {
      setError("Please enter a valid date and time.");
      return;
    }

    const dur = Number(durationMins) || 30;
    const startDate = new Date(startAt);
    const endDate = new Date(startDate.getTime() + dur * 60 * 1000);
    const endAt = endDate.toISOString();

    const payload = {
      // patient is NOT sent; backend infers from logged-in user
      appt_type: apptType,
      start_at: startAt,
      end_at: endAt,
    };

    const provider = Number(providerId);
    if (provider && !Number.isNaN(provider)) {
      payload.provider = provider;
    }

    const facility = Number(facilityId);
    if (facility && !Number.isNaN(facility)) {
      payload.facility = facility;
    }

    if (reason.trim()) {
      payload.reason = reason.trim();
    }

    if (notifyEmail.trim()) {
      payload.notify_email = notifyEmail.trim();
    }

    setIsSubmitting(true);
    try {
      await createAppointment(payload);
      router.push("/patient/appointments");
    } catch (err) {
      console.error("Create appointment failed", err);
      setError(
        err?.message ||
          "Failed to create appointment. Please check your entries and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = !isSubmitting && !!date && !!time;

  const selectedProvider = providers.find(
    (p) => String(p.id) === String(providerId)
  );
  const selectedFacility = facilities.find(
    (f) => String(f.id) === String(facilityId)
  );

  const providerName = selectedProvider
    ? [selectedProvider.first_name, selectedProvider.last_name]
        .filter(Boolean)
        .join(" ")
    : "";
  const providerRole = selectedProvider
    ? selectedProvider.specialty || selectedProvider.role || ""
    : "";

  const facilityName = selectedFacility
    ? selectedFacility.name || `Facility #${selectedFacility.id}`
    : "";

  return (
    <main className="relative mx-auto max-w-5xl p-6 md:p-10 space-y-6">
      {/* soft background accents for design parity */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100 blur-3xl opacity-60" />

      {/* Header */}
      <header className="mb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <CalendarRange className="h-3.5 w-3.5" />
            Patient · Book Appointment
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Book an appointment
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Pick a time that works for you. Your patient profile will be used
            automatically by the clinic.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/patient/appointments")}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to my appointments
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
                  We use this to estimate when your visit will end.
                </p>
              </div>
            </div>

            {/* Provider / Facility dropdowns */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Provider select */}
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
                      : "Any available provider"}
                  </option>
                  {!loadingProviders &&
                    providers.map((p) => {
                      const fullName = [p.first_name, p.last_name]
                        .filter(Boolean)
                        .join(" ");
                      const roleOrSpec = p.specialty || p.role || "";
                      const label = fullName || p.email || `Provider #${p.id}`;
                      return (
                        <option key={p.id} value={String(p.id)}>
                          {label}
                          {roleOrSpec ? ` – ${roleOrSpec}` : ""}
                        </option>
                      );
                    })}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  You can leave this empty and the clinic will route you to an
                  available provider.
                </p>
              </div>

              {/* Facility select */}
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  Facility (optional)
                </label>
                <select
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">
                    {loadingFacilities
                      ? "Loading facilities…"
                      : "Any facility linked to my account"}
                  </option>
                  {!loadingFacilities &&
                    facilities.map((f) => (
                      <option key={f.id} value={String(f.id)}>
                        {f.name || `Facility #${f.id}`}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  If you only use one clinic, you can leave this empty.
                </p>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Reason for visit (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Briefly describe why you are booking this appointment."
              />
            </div>

            {/* Notify email */}
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Mail className="h-4 w-4 text-slate-500" />
                Email for reminders (optional)
              </label>
              <input
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                We&apos;ll send confirmations and reminders to this address if
                you provide it.
              </p>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={() => router.push("/patient/appointments")}
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
              {isSubmitting ? "Booking…" : "Book appointment"}
            </button>
          </div>
        </form>

        {/* Right rail: overview + info */}
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500/70 via-teal-500/70 to-cyan-500/70" />
            <div className="p-5 text-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Your booking overview
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                A quick summary of the details you&apos;ve chosen so far.
              </p>

              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Appointment type</dt>
                  <dd className="text-right text-slate-900">
                    {
                      (APPT_TYPES.find((t) => t.value === apptType) || {})
                        .label || apptType
                    }
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Date</dt>
                  <dd className="text-right text-slate-900">
                    {date || "Not set"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Time</dt>
                  <dd className="text-right text-slate-900">
                    {time || "Not set"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Duration</dt>
                  <dd className="text-right text-slate-900">
                    {durationMins ? `${durationMins} mins` : "Default (30 mins)"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Provider</dt>
                  <dd className="text-right text-slate-900">
                    {providerName || "Any available"}
                    {providerRole ? ` · ${providerRole}` : ""}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Facility</dt>
                  <dd className="text-right text-slate-900">
                    {facilityName || "Any linked facility"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <div className="mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-900">
                What the clinic sees
              </h3>
            </div>
            <p className="mb-2">
              When you book, the clinic receives your chosen date/time,
              appointment type, and any notes you add.
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Your patient profile is linked automatically.</li>
              <li>
                If you don&apos;t pick a provider, the clinic assigns one based
                on availability.
              </li>
              <li>
                You can always check the status of your booking from your
                appointments page.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
