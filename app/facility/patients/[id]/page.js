// app/facility/patients/[id]/page.js
"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import PatientDocumentsProvider from "@/components/patient/PatientDocumentsProvider";
import PatientDocumentUploadProvider from "@/components/patient/PatientDocumentUploadProvider";
import PatientVitalsHistory from "@/components/patient/PatientVitalsHistory";
import PatientAllergies from "@/components/patient/Patientallergies";
import PatientInsurance from "./components/PatientInsurance";
import { 
  Activity, 
  FileText, 
  Stethoscope, 
  AlertTriangle, 
  PlayCircle, 
  Loader2, 
  X,
  Lock,
  UserRound,
  CalendarClock
} from "lucide-react";

export default function FacilityPatientDetailPage(props) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <FacilityPatientDetailPageInner {...props} />
    </Suspense>
  );
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

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

function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;

  // "numeric-key object" fallback (some BFF routes spread arrays)
  if (typeof data === "object") {
    const keys = Object.keys(data).filter((k) => /^\d+$/.test(k));
    if (keys.length) {
      return keys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => data[k])
        .filter(Boolean);
    }
  }

  return [];
}

function statusBadge(status) {
  const s = String(status || "").toUpperCase();
  const map = {
    OPEN: "bg-slate-50 text-slate-700 ring-slate-200",
    IN_PROGRESS: "bg-blue-50 text-blue-700 ring-blue-200",
    WAITING_LABS: "bg-amber-50 text-amber-800 ring-amber-200",
    CLOSED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    CROSSED_OUT: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return map[s] || "bg-slate-50 text-slate-700 ring-slate-200";
}

function stageBadge(stage) {
  const s = String(stage || "").toUpperCase();
  const map = {
    LABS: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    WAITING_LABS: "bg-amber-50 text-amber-800 ring-amber-200",
    NOTE: "bg-blue-50 text-blue-700 ring-blue-200",
    PRESCRIPTION: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
  return map[s] || "bg-slate-50 text-slate-700 ring-slate-200";
}

// Add Vitals Modal Component
function AddVitalsModal({ open, onClose, patientId, onSuccess }) {
  const [formData, setFormData] = useState({
    measured_at: new Date().toISOString().slice(0, 16),
    systolic: "",
    diastolic: "",
    heart_rate: "",
    temp_c: "",
    resp_rate: "",
    spo2: "",
    weight_kg: "",
    height_cm: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError("");

      // Prepare data - only include non-empty fields
      const payload = {
        patient: parseInt(patientId),
        measured_at: formData.measured_at,
      };

      // Add numeric fields only if they have values
      if (formData.systolic) payload.systolic = parseInt(formData.systolic);
      if (formData.diastolic) payload.diastolic = parseInt(formData.diastolic);
      if (formData.heart_rate) payload.heart_rate = parseInt(formData.heart_rate);
      if (formData.temp_c) payload.temp_c = parseFloat(formData.temp_c);
      if (formData.resp_rate) payload.resp_rate = parseInt(formData.resp_rate);
      if (formData.spo2) payload.spo2 = parseInt(formData.spo2);
      if (formData.weight_kg) payload.weight_kg = parseFloat(formData.weight_kg);
      if (formData.height_cm) payload.height_cm = parseFloat(formData.height_cm);
      if (formData.notes) payload.notes = formData.notes;

      await apiFetch("/vitals/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Reset form
      setFormData({
        measured_at: new Date().toISOString().slice(0, 16),
        systolic: "",
        diastolic: "",
        heart_rate: "",
        temp_c: "",
        resp_rate: "",
        spo2: "",
        weight_kg: "",
        height_cm: "",
        notes: "",
      });

      // Notify parent and close
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to add vitals:", err);
      setError(err?.message || "Failed to add vitals. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Activity className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Add Vital Signs</h2>
              <p className="text-xs text-slate-500">Record patient vitals</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Measurement Time */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Measurement Time *
              </label>
              <input
                type="datetime-local"
                value={formData.measured_at}
                onChange={(e) => handleChange("measured_at", e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Blood Pressure */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Systolic (mmHg)
                </label>
                <input
                  type="number"
                  value={formData.systolic}
                  onChange={(e) => handleChange("systolic", e.target.value)}
                  min="40"
                  max="300"
                  placeholder="120"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Diastolic (mmHg)
                </label>
                <input
                  type="number"
                  value={formData.diastolic}
                  onChange={(e) => handleChange("diastolic", e.target.value)}
                  min="20"
                  max="200"
                  placeholder="80"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Heart Rate & Temperature */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Heart Rate (bpm)
                </label>
                <input
                  type="number"
                  value={formData.heart_rate}
                  onChange={(e) => handleChange("heart_rate", e.target.value)}
                  min="20"
                  max="250"
                  placeholder="72"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.temp_c}
                  onChange={(e) => handleChange("temp_c", e.target.value)}
                  placeholder="36.5"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Respiratory Rate & SpO2 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Respiratory Rate (breaths/min)
                </label>
                <input
                  type="number"
                  value={formData.resp_rate}
                  onChange={(e) => handleChange("resp_rate", e.target.value)}
                  min="5"
                  max="80"
                  placeholder="16"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  SpO2 (%)
                </label>
                <input
                  type="number"
                  value={formData.spo2}
                  onChange={(e) => handleChange("spo2", e.target.value)}
                  min="50"
                  max="100"
                  placeholder="98"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Weight & Height */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.weight_kg}
                  onChange={(e) => handleChange("weight_kg", e.target.value)}
                  placeholder="70.5"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.height_cm}
                  onChange={(e) => handleChange("height_cm", e.target.value)}
                  placeholder="170"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={3}
                placeholder="Additional observations..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Vitals"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FacilityPatientDetailPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hideActions = searchParams.get('hide_actions') === 'true';
  const fromEncounter = searchParams.get('from_encounter');
  
  const params = useParams();
  const patientId = params?.id;

  const [patient, setPatient] = useState(null);
  const [patientError, setPatientError] = useState("");
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [startingEncounter, setStartingEncounter] = useState(false);
  const [me, setMe] = useState(null);
  
  // State for encounter history
  const [encounterPayload, setEncounterPayload] = useState(null);
  const [loadingEncounters, setLoadingEncounters] = useState(true);
  const [encounterError, setEncounterError] = useState("");
  
  // State for vitals modal
  const [vitalsModalOpen, setVitalsModalOpen] = useState(false);
  const [vitalsRefreshKey, setVitalsRefreshKey] = useState(0);

  // Normalize encounters from API response
  const encounters = useMemo(() => normalizeList(encounterPayload), [encounterPayload]);

  // Load current user
  useEffect(() => {
    async function loadMe() {
      try {
        const data = await apiFetch("/accounts/me/", { method: "GET" });
        setMe(data || null);
      } catch {
        setMe(null);
      }
    }
    loadMe();
  }, []);

  useEffect(() => {
    if (!patientId) return;

    async function loadPatient() {
      try {
        setLoadingPatient(true);
        setPatientError("");
        const data = await apiFetch(`/patients/${patientId}/`);
        setPatient(data);
      } catch (err) {
        console.error("Failed to load patient", err);
        setPatientError("Unable to load patient details. Please try again.");
      } finally {
        setLoadingPatient(false);
      }
    }

    loadPatient();
  }, [patientId]);

  // Load encounter history
  useEffect(() => {
    if (!patientId) return;

    let cancelled = false;

    async function loadEncounters() {
      try {
        setLoadingEncounters(true);
        setEncounterError("");
        
        // Backend orders by -occurred_at, -id by default
        const data = await apiFetch(`/encounters/?patient=${patientId}`);
        if (cancelled) return;
        setEncounterPayload(data);
      } catch (err) {
        console.error("Failed to load encounters", err);
        if (!cancelled) {
          setEncounterError(
            err?.message || "Unable to load encounters for this patient. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoadingEncounters(false);
      }
    }

    loadEncounters();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const fullName =
    patient?.first_name && patient?.last_name
      ? `${patient?.first_name} ${patient?.last_name}`
      : "—";

  const displayName =
    fullName || patient?.email || (patient ? `Patient #${patient.id}` : "");

  const handleUploadSuccess = (documentData) => {
    setPatient((prev) => ({
      ...prev,
      documents: [documentData, ...(prev?.documents || [])],
    }));
  };

  const genderLabel = patient?.gender || "N/A";

  // Handle start encounter
  const handleStartEncounter = async () => {
    if (!patientId || startingEncounter) return;

    try {
      setStartingEncounter(true);
      const enc = await apiFetch(`/encounters/start-from-patient/`, {
        method: "POST",
        body: JSON.stringify({ patient_id: patientId }),
      });

      const encounterId = enc?.id;
      if (!encounterId) throw new Error("No encounter ID returned");

      // Route based on user role
      const role = String(me?.role || "").toUpperCase();
      if (role === "DOCTOR") {
        router.push(`/facility/encounters/${encounterId}/workflow/clinical`);
      } else {
        router.push(`/facility/encounters/${encounterId}/workflow/nurse`);
      }
    } catch (err) {
      console.error("Failed to start encounter:", err);
      alert(err?.message || "Failed to start encounter. Please try again.");
    } finally {
      setStartingEncounter(false);
    }
  };

  // Handle vitals modal success
  const handleVitalsSuccess = () => {
    // Trigger refresh of vitals history component
    setVitalsRefreshKey((prev) => prev + 1);
  };

  const goToEncounter = (encounterId) => {
    router.push(`/facility/encounters/${encounterId}/workflow/clinical`);
  };

  return (
    <main className="min-h-screen bg-slate-50/80">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
        {/* Back Link */}
        <button
          type="button"
          onClick={() => {
            if (fromEncounter) {
              router.push(`/facility/encounters/${fromEncounter}/workflow/clinical`);
            } else {
              router.push("/facility/patients");
            }
          }}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
        >
          <span className="text-sm">←</span>
          <span>{fromEncounter ? 'Back to encounter' : 'Back to patients'}</span>
        </button>

        {/* Compact Header + overview card */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
          <div className="relative h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

          <div className="relative p-4 md:p-5">
            {/* Title row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-sm font-semibold text-blue-700">
                  {loadingPatient
                    ? "…"
                    : (displayName || "")
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 mb-1">
                    Patient record
                  </div>
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
                    {loadingPatient ? "Loading…" : displayName || "Patient"}
                  </h1>
                  {patient && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      ID: <span className="font-medium text-slate-800">{patient.id}</span>
                      {patient.mrn && <> • MRN: <span className="font-medium text-slate-800">{patient.mrn}</span></>}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Add Vitals button - always visible, opens modal */}
                <button
                  type="button"
                  onClick={() => setVitalsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <Activity className="h-3.5 w-3.5" />
                  Add Vitals
                </button>

                {/* Start Encounter button - only visible when NOT viewing from active encounter */}
                {!hideActions && (
                  <button
                    type="button"
                    onClick={handleStartEncounter}
                    disabled={startingEncounter}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
                  >
                    {startingEncounter ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-3.5 w-3.5" />
                        Start Encounter
                      </>
                    )}
                  </button>
                )}

                {/* Show info badge when viewing from active encounter */}
                {hideActions && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
                    Viewing from active encounter
                  </div>
                )}
              </div>
            </div>

            {/* Error or skeleton or details */}
            {loadingPatient ? (
              <div className="mt-4 grid animate-pulse gap-2 grid-cols-2 md:grid-cols-4">
                <div className="h-14 rounded-xl bg-slate-100" />
                <div className="h-14 rounded-xl bg-slate-100" />
                <div className="h-14 rounded-xl bg-slate-100" />
                <div className="h-14 rounded-xl bg-slate-100" />
              </div>
            ) : patientError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {patientError}
              </div>
            ) : patient ? (
              <div className="mt-4 grid gap-2 grid-cols-2 md:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Date of birth
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDate(patient.dob)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Gender
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {genderLabel}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Email
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-slate-900">
                    {patient.email || "N/A"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Phone
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {patient.phone || "N/A"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Patient not found.
              </div>
            )}
          </div>
        </section>

        {/* Grid Layout for Sections */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Allergies - Compact */}
          <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
            <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />
            <div className="p-3 md:p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                    Allergies
                  </h2>
                </div>
              </div>
              <PatientAllergies patientId={patientId} />
            </div>
          </section>

          {/* Vitals History - Compact */}
          <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500" />
            <div className="p-3 md:p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
                  <Activity className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                    Vitals History
                  </h2>
                </div>
              </div>
              <PatientVitalsHistory key={vitalsRefreshKey} patientId={patientId} />
            </div>
          </section>
        </div>

        {/* Encounter History Section - Using PatientEncounterListModal table structure */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
          <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
          <div className="p-4 md:p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-50 border border-slate-200">
                <Stethoscope className="h-4 w-4 text-slate-700" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Encounter History
                </h2>
                <p className="text-xs text-slate-500">
                  Recent clinical encounters recorded in this facility
                </p>
              </div>
            </div>

            {/* Loading state */}
            {loadingEncounters && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                Loading encounters…
              </div>
            )}

            {/* Error state */}
            {encounterError && (
              <div className="mb-3 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{encounterError}</span>
              </div>
            )}

            {/* Empty state */}
            {!loadingEncounters && !encounterError && encounters.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                No encounters found for this patient yet.
              </div>
            )}

            {/* Table with encounters */}
            {encounters.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        When
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Stage
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Nurse
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Provider
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Summary
                      </th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {encounters.map((enc) => {
                      const nurse = enc.nurse_name || (enc.nurse ? `User #${enc.nurse}` : "—");
                      const provider = enc.provider_name || (enc.provider ? `User #${enc.provider}` : "—");
                      const summary = enc.chief_complaint || enc.diagnoses || enc.plan || "—";

                      return (
                        <tr key={enc.id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-3 align-top">
                            <div className="font-medium text-slate-900">
                              {formatDateTime(enc.occurred_at)}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              Encounter #{enc.id}
                            </div>
                          </td>

                          <td className="px-3 py-3 align-top">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusBadge(
                                enc.status
                              )}`}
                            >
                              {enc.status || "—"}
                            </span>
                            {enc.locked && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                                <Lock className="h-3 w-3" />
                                Locked
                              </span>
                            )}
                          </td>

                          <td className="px-3 py-3 align-top">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${stageBadge(
                                enc.stage
                              )}`}
                            >
                              {enc.stage || "—"}
                            </span>
                          </td>

                          <td className="px-3 py-3 align-top">
                            <div className="flex items-center gap-2">
                              <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-50 border border-slate-200">
                                <UserRound className="h-3.5 w-3.5 text-slate-600" />
                              </span>
                              <div className="min-w-0">
                                <div className="truncate font-medium text-slate-900">
                                  {nurse}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-3 align-top">
                            <div className="truncate font-medium text-slate-900">
                              {provider}
                            </div>
                          </td>

                          <td className="px-3 py-3 align-top">
                            <div className="line-clamp-2 max-w-[420px] text-slate-700">
                              {summary}
                            </div>
                          </td>

                          <td className="px-3 py-3 align-top text-right">
                            <button
                              type="button"
                              onClick={() => goToEncounter(enc.id)}
                              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Documents Grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Documents viewing */}
          <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
            <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
            <div className="p-3 md:p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                    Documents
                  </h2>
                </div>
              </div>
              <PatientDocumentsProvider patientId={patientId} />
            </div>
          </section>

          {/* Upload new document */}
          <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
            <div className="h-1 bg-gradient-to-r from-indigo-500 via-blue-600 to-emerald-500" />
            <div className="p-3 md:p-4">
              <div className="mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                  Upload Document
                </h2>
              </div>
              <PatientDocumentUploadProvider
                patientId={patientId}
                onUploadSuccess={handleUploadSuccess}
              />
            </div>
          </section>
        </div>
      </div>

      {/* Add Vitals Modal */}
      <AddVitalsModal
        open={vitalsModalOpen}
        onClose={() => setVitalsModalOpen(false)}
        patientId={patientId}
        onSuccess={handleVitalsSuccess}
      />
      <section>
        <PatientInsurance patientId={patientId} />
      </section>
    </main>
  );
}