"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { DateTime } from "luxon";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Activity,
  Thermometer,
  HeartPulse,
  Droplets,
  Gauge,
  Bell,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  UserRound,
  X,
  Plus,
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

function normalizeList(body) {
  if (!body) return [];
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body)) return body;
  return [];
}

function VitalMetric({ icon: Icon, label, value, unit, color = "text-slate-600" }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
      <div className="flex items-center gap-2">
        <div className={`rounded-md bg-white p-1.5 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-900">
        {value || "—"}
        {value && unit && (
          <span className="ml-1 text-xs font-normal text-slate-500">{unit}</span>
        )}
      </span>
    </div>
  );
}

function OverallBadge({ value }) {
  const v = String(value || "").toUpperCase();
  const config = {
    GREEN: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", label: "Normal" },
    YELLOW: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200", label: "Warning" },
    RED: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200", label: "Critical" },
  };
  const style = config[v] || { bg: "bg-slate-50", text: "text-slate-700", ring: "ring-slate-200", label: value || "—" };

  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ring-1 ${style.bg} ${style.text} ${style.ring}`}>
      {v === "RED" && <AlertCircle className="h-3 w-3" />}
      {style.label}
    </span>
  );
}

function StatusPill({ status }) {
  const statusUpper = String(status || "").toUpperCase();
  
  const statusConfig = {
    OPEN: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Open" },
    IN_PROGRESS: { bg: "bg-blue-50", text: "text-blue-700", label: "In Progress" },
    WAITING_LABS: { bg: "bg-amber-50", text: "text-amber-700", label: "Waiting Labs" },
    CLOSED: { bg: "bg-slate-100", text: "text-slate-700", label: "Closed" },
    CROSSED_OUT: { bg: "bg-red-50", text: "text-red-700", label: "Crossed Out" },
  };

  const config = statusConfig[statusUpper] || { bg: "bg-slate-50", text: "text-slate-600", label: status || "Unknown" };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.bg} ${config.text}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

export default function ProviderEncounterNursePage() {
  const params = useParams();
  const router = useRouter();
  const encounterId = params?.id;

  const [me, setMe] = useState(null);
  const [encounter, setEncounter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Vitals state
  const [vitals, setVitals] = useState([]);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [vitalsError, setVitalsError] = useState("");

  // New vitals form
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [vitalsForm, setVitalsForm] = useState({
    systolic: "",
    diastolic: "",
    heart_rate: "",
    temp_c: "",
    resp_rate: "",
    spo2: "",
    weight_kg: "",
    height_cm: "",
  });
  const [vitalsSubmitting, setVitalsSubmitting] = useState(false);
  const [vitalsSuccess, setVitalsSuccess] = useState("");

  // Reminder modal
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderTime, setReminderTime] = useState(DateTime.now().plus({ hours: 1 }).toISO().slice(0, 16));
  const [reminderSubmitting, setReminderSubmitting] = useState(false);
  const [reminderSuccess, setReminderSuccess] = useState("");
  const [reminderError, setReminderError] = useState("");

  async function loadMe() {
    try {
      const data = await apiFetch("/accounts/me/", { method: "GET" });
      setMe(data || null);
    } catch {
      setMe(null);
    }
  }

  async function loadEncounter() {
    if (!encounterId) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/encounters/${encounterId}/`, { method: "GET" });
      setEncounter(data);
    } catch (err) {
      setError(err?.message || "Failed to load encounter.");
      setEncounter(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadVitals() {
    if (!encounter?.patient) return;
    setVitalsLoading(true);
    setVitalsError("");
    try {
      const data = await apiFetch(`/vitals/?patient=${encounter.patient}&limit=10`);
      setVitals(normalizeList(data));
    } catch (err) {
      setVitalsError(err?.message || "Failed to load vitals.");
      setVitals([]);
    } finally {
      setVitalsLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
    loadEncounter();
  }, [encounterId]);

  useEffect(() => {
    if (encounter?.patient) {
      loadVitals();
    }
  }, [encounter?.patient]);

  const role = String(me?.role || "").toUpperCase();
  const providerType = String(me?.provider_type || "").toUpperCase();
  
  const canProceed = useMemo(() => {
    return ["DOCTOR", "ADMIN", "SUPER_ADMIN"].includes(role) || providerType === "DOCTOR";
  }, [role, providerType]);

  const isNurse = role === "NURSE" || providerType === "NURSE";
  const patientId = encounter?.patient;

  const patientName =
    encounter?.patient_name ||
    (encounter?.patient_first_name || encounter?.patient_last_name
      ? `${encounter?.patient_first_name || ""} ${encounter?.patient_last_name || ""}`.trim()
      : "") ||
    `Patient #${patientId || "—"}`;

  const handleVitalsChange = (e) => {
    const { name, value } = e.target;
    setVitalsForm((prev) => ({ ...prev, [name]: value }));
  };

  async function handleSubmitVitals(e) {
    e.preventDefault();
    if (!patientId) return;

    setVitalsSubmitting(true);
    setVitalsError("");
    setVitalsSuccess("");

    try {
      const payload = {
        patient: patientId,
        measured_at: new Date().toISOString(),
        encounter: encounterId,
      };

      if (vitalsForm.systolic) payload.systolic = parseInt(vitalsForm.systolic);
      if (vitalsForm.diastolic) payload.diastolic = parseInt(vitalsForm.diastolic);
      if (vitalsForm.heart_rate) payload.heart_rate = parseInt(vitalsForm.heart_rate);
      if (vitalsForm.temp_c) payload.temp_c = parseFloat(vitalsForm.temp_c);
      if (vitalsForm.resp_rate) payload.resp_rate = parseInt(vitalsForm.resp_rate);
      if (vitalsForm.spo2) payload.spo2 = parseInt(vitalsForm.spo2);
      if (vitalsForm.weight_kg) payload.weight_kg = parseFloat(vitalsForm.weight_kg);
      if (vitalsForm.height_cm) payload.height_cm = parseFloat(vitalsForm.height_cm);

      await apiFetch("/vitals/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setVitalsSuccess("Vitals recorded successfully.");
      setVitalsForm({
        systolic: "",
        diastolic: "",
        heart_rate: "",
        temp_c: "",
        resp_rate: "",
        spo2: "",
        weight_kg: "",
        height_cm: "",
      });
      setShowVitalsForm(false);
      await loadVitals();
    } catch (err) {
      setVitalsError(err?.message || "Failed to record vitals.");
    } finally {
      setVitalsSubmitting(false);
    }
  }

  async function handleSubmitReminder(e) {
    e.preventDefault();
    if (!patientId || !reminderMessage.trim()) return;

    setReminderSubmitting(true);
    setReminderError("");
    setReminderSuccess("");

    try {
      await apiFetch("/notifications/reminders/", {
        method: "POST",
        body: JSON.stringify({
          patient: patientId,
          encounter: encounterId,
          message: reminderMessage.trim(),
          reminder_time: new Date(reminderTime).toISOString(),
        }),
      });

      setReminderSuccess("Reminder set successfully.");
      setReminderMessage("");
      setReminderTime(DateTime.now().plus({ hours: 1 }).toISO().slice(0, 16));
      setTimeout(() => {
        setShowReminderModal(false);
        setReminderSuccess("");
      }, 1500);
    } catch (err) {
      setReminderError(err?.message || "Failed to set reminder.");
    } finally {
      setReminderSubmitting(false);
    }
  }

  function handleProceedToLabs() {
    router.push(`/provider/encounters/${encounterId}/workflow/labs`);
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-slate-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading encounter…
        </div>
      </div>
    );
  }

  if (error && !encounter) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <div className="font-semibold">Could not open encounter</div>
          <div className="mt-1 text-sm">{error}</div>
          <div className="mt-3">
            <Link
              href="/provider/encounters"
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Encounters
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const latestVital = vitals[0] || null;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Link
              href={`/provider/encounters/${encounterId}`}
              className="inline-flex items-center gap-2 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Encounter
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-slate-800">Nurse Assessment</span>
          </div>

          <h1 className="mt-2 text-xl font-semibold text-slate-900">
            Nurse Assessment & Vitals
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Record patient vitals and set reminders before proceeding to clinical workflow.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={encounter?.status} />
          
          <button
            type="button"
            onClick={() => setShowReminderModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Bell className="h-4 w-4" />
            Set Reminder
          </button>

          {canProceed ? (
            <button
              type="button"
              onClick={handleProceedToLabs}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Continue to Labs
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              <Clock className="h-4 w-4" />
              Awaiting Doctor
            </div>
          )}
        </div>
      </div>

      {/* Encounter Info Card */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <UserRound className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Patient</p>
              <p className="text-sm font-semibold text-slate-900">{patientName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Provider</p>
              <p className="text-sm font-semibold text-slate-900">
                {encounter?.provider_name || "Unassigned"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Started</p>
              <p className="text-sm font-semibold text-slate-900">
                {formatDateTime(encounter?.occurred_at || encounter?.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <Activity className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Status</p>
              <StatusPill status={encounter?.status} />
            </div>
          </div>
        </div>

        {encounter?.reason && (
          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Chief Complaint / Reason</p>
            <p className="mt-1 text-sm text-slate-800">{encounter.reason}</p>
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {vitalsSuccess && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {vitalsSuccess}
          </div>
        </div>
      )}

      {vitalsError && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {vitalsError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Latest Vitals Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
                <Activity className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Latest Vitals</h2>
                {latestVital && (
                  <p className="text-xs text-slate-500">
                    {formatDateTime(latestVital.measured_at)}
                  </p>
                )}
              </div>
            </div>

            {latestVital && <OverallBadge value={latestVital.overall} />}
          </div>

          <div className="p-4">
            {vitalsLoading ? (
              <div className="flex items-center gap-2 py-8 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading vitals…
              </div>
            ) : latestVital ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <VitalMetric
                  icon={Activity}
                  label="Blood Pressure"
                  value={
                    latestVital.systolic && latestVital.diastolic
                      ? `${latestVital.systolic}/${latestVital.diastolic}`
                      : null
                  }
                  unit="mmHg"
                />
                <VitalMetric
                  icon={HeartPulse}
                  label="Heart Rate"
                  value={latestVital.heart_rate}
                  unit="bpm"
                  color="text-rose-600"
                />
                <VitalMetric
                  icon={Thermometer}
                  label="Temperature"
                  value={latestVital.temp_c}
                  unit="°C"
                  color="text-amber-600"
                />
                <VitalMetric
                  icon={Droplets}
                  label="SpO₂"
                  value={latestVital.spo2}
                  unit="%"
                  color="text-blue-600"
                />
                {latestVital.resp_rate && (
                  <VitalMetric
                    icon={Activity}
                    label="Resp. Rate"
                    value={latestVital.resp_rate}
                    unit="br/min"
                  />
                )}
                {latestVital.bmi && (
                  <VitalMetric
                    icon={Gauge}
                    label="BMI"
                    value={latestVital.bmi}
                    unit=""
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Activity className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700">No vitals recorded</p>
                <p className="mt-1 text-xs text-slate-500">
                  Record vitals to begin the clinical assessment
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 p-4">
            <button
              type="button"
              onClick={() => setShowVitalsForm(!showVitalsForm)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              {showVitalsForm ? "Cancel" : "Record New Vitals"}
            </button>
          </div>
        </div>

        {/* Record Vitals Form */}
        {showVitalsForm && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                <Thermometer className="h-4 w-4 text-blue-600" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">Record Vitals</h2>
            </div>

            <form onSubmit={handleSubmitVitals} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Systolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    name="systolic"
                    value={vitalsForm.systolic}
                    onChange={handleVitalsChange}
                    placeholder="120"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Diastolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    name="diastolic"
                    value={vitalsForm.diastolic}
                    onChange={handleVitalsChange}
                    placeholder="80"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Heart Rate (bpm)
                  </label>
                  <input
                    type="number"
                    name="heart_rate"
                    value={vitalsForm.heart_rate}
                    onChange={handleVitalsChange}
                    placeholder="72"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="temp_c"
                    value={vitalsForm.temp_c}
                    onChange={handleVitalsChange}
                    placeholder="36.5"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Respiratory Rate (br/min)
                  </label>
                  <input
                    type="number"
                    name="resp_rate"
                    value={vitalsForm.resp_rate}
                    onChange={handleVitalsChange}
                    placeholder="16"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    SpO₂ (%)
                  </label>
                  <input
                    type="number"
                    name="spo2"
                    value={vitalsForm.spo2}
                    onChange={handleVitalsChange}
                    placeholder="98"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="weight_kg"
                    value={vitalsForm.weight_kg}
                    onChange={handleVitalsChange}
                    placeholder="70"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="height_cm"
                    value={vitalsForm.height_cm}
                    onChange={handleVitalsChange}
                    placeholder="175"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-500">Only fields with values will be saved.</p>
                <button
                  type="submit"
                  disabled={vitalsSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {vitalsSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Save Vitals
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Vitals History */}
        {vitals.length > 1 && !showVitalsForm && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Recent Vitals History</h2>
              <p className="text-xs text-slate-500">Last {Math.min(vitals.length, 5)} recordings</p>
            </div>
            <div className="divide-y divide-slate-100">
              {vitals.slice(0, 5).map((v, idx) => (
                <div key={v.id || idx} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-slate-500">{formatDateTime(v.measured_at)}</div>
                    <div className="text-sm text-slate-800">
                      {v.systolic && v.diastolic && (
                        <span className="mr-3">BP: {v.systolic}/{v.diastolic}</span>
                      )}
                      {v.heart_rate && <span className="mr-3">HR: {v.heart_rate}</span>}
                      {v.temp_c && <span>Temp: {v.temp_c}°C</span>}
                    </div>
                  </div>
                  <OverallBadge value={v.overall} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Role-based message for nurses */}
      {isNurse && (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <Clock className="h-4 w-4 text-blue-700" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-900">Awaiting Doctor Review</h3>
              <p className="mt-1 text-sm text-blue-800">
                You've completed the nurse assessment. A doctor will continue the encounter 
                with labs, diagnosis, and prescription when ready.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50">
                  <Bell className="h-4 w-4 text-amber-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Set Reminder</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowReminderModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {reminderSuccess && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {reminderSuccess}
                </div>
              </div>
            )}

            {reminderError && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {reminderError}
              </div>
            )}

            <form onSubmit={handleSubmitReminder} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Reminder Message
                </label>
                <textarea
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  rows={3}
                  placeholder="e.g., Recheck vitals in 2 hours, follow up on lab results..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Reminder Time
                </label>
                <input
                  type="datetime-local"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReminderModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reminderSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {reminderSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  Set Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}