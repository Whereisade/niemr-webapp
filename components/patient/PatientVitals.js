// components/patient/PatientVitals.js
"use client";

import { useState } from "react";
import { useVitals } from "@/lib/useVitals";
import { apiFetch } from "@/lib/api";
import { 
  Loader2, 
  Activity, 
  Thermometer, 
  HeartPulse, 
  Droplets, 
  TrendingUp,
  Calendar,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  X,
} from "lucide-react";

function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  return [];
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

function VitalBadge({ value }) {
  const v = String(value || "").toUpperCase();
  const config = {
    GREEN: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Normal" },
    YELLOW: { bg: "bg-amber-50", text: "text-amber-700", label: "Warning" },
    RED: { bg: "bg-rose-50", text: "text-rose-700", label: "Critical" },
  };
  const style = config[v] || { bg: "bg-slate-50", text: "text-slate-700", label: value || "—" };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function VitalRow({ icon: Icon, label, value, unit, badge }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs text-slate-600">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-900">
          {value || "—"}
          {value && unit && (
            <span className="ml-0.5 text-[10px] font-normal text-slate-500">{unit}</span>
          )}
        </span>
        {badge && <VitalBadge value={badge} />}
      </div>
    </div>
  );
}

export default function PatientVitals({ patientId, encounterId }) {
  const { data, isLoading, error, mutate } = useVitals({ 
    patient: patientId, 
    limit: 5 
  });

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

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

  const vitals = normalizeList(data);
  const latest = vitals[0];

  const handleVitalsChange = (e) => {
    const { name, value } = e.target;
    setVitalsForm((prev) => ({ ...prev, [name]: value }));
  };

  async function handleSubmitVitals(e) {
    e.preventDefault();
    if (!patientId) return;

    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const payload = {
        patient: patientId,
        measured_at: new Date().toISOString(),
      };

      // Add encounter if provided
      if (encounterId) {
        payload.encounter = encounterId;
      }

      // Add only filled fields
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

      setSubmitSuccess("Vitals recorded successfully!");
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
      
      // Refresh vitals list
      await mutate();
      
      // Close form after 1.5 seconds
      setTimeout(() => {
        setShowForm(false);
        setSubmitSuccess("");
      }, 1500);
    } catch (err) {
      setSubmitError(err?.message || "Failed to record vitals.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading vitals…
      </div>
    );
  }

  if (error) {
    return <div className="text-xs text-rose-600">{error?.message || "Unable to load vitals."}</div>;
  }

  return (
    <div className="space-y-3">
      {/* Add Vitals Button / Form Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-700">
          {vitals.length > 0 ? "Latest Reading" : "No Vitals Yet"}
        </span>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
        >
          {showForm ? (
            <>
              <X className="h-3 w-3" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-3 w-3" />
              Add Vitals
            </>
          )}
        </button>
      </div>

      {/* Add Vitals Form */}
      {showForm && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
          <form onSubmit={handleSubmitVitals} className="space-y-2">
            <div className="text-xs font-semibold text-slate-800">Record New Vitals</div>

            {submitSuccess && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {submitSuccess}
                </div>
              </div>
            )}

            {submitError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
                {submitError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-slate-600">
                  Systolic BP
                </label>
                <input
                  type="number"
                  name="systolic"
                  value={vitalsForm.systolic}
                  onChange={handleVitalsChange}
                  placeholder="120"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-slate-600">
                  Diastolic BP
                </label>
                <input
                  type="number"
                  name="diastolic"
                  value={vitalsForm.diastolic}
                  onChange={handleVitalsChange}
                  placeholder="80"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-slate-600">
                  Heart Rate (bpm)
                </label>
                <input
                  type="number"
                  name="heart_rate"
                  value={vitalsForm.heart_rate}
                  onChange={handleVitalsChange}
                  placeholder="72"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-slate-600">
                  Temp (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="temp_c"
                  value={vitalsForm.temp_c}
                  onChange={handleVitalsChange}
                  placeholder="36.5"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-slate-600">
                  SpO₂ (%)
                </label>
                <input
                  type="number"
                  name="spo2"
                  value={vitalsForm.spo2}
                  onChange={handleVitalsChange}
                  placeholder="98"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-slate-600">
                  Resp Rate
                </label>
                <input
                  type="number"
                  name="resp_rate"
                  value={vitalsForm.resp_rate}
                  onChange={handleVitalsChange}
                  placeholder="16"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-slate-600">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="weight_kg"
                  value={vitalsForm.weight_kg}
                  onChange={handleVitalsChange}
                  placeholder="70"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-slate-600">
                  Height (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="height_cm"
                  value={vitalsForm.height_cm}
                  onChange={handleVitalsChange}
                  placeholder="175"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {submitting ? "Saving..." : "Save Vitals"}
            </button>
          </form>
        </div>
      )}

      {/* Latest vitals display */}
      {!showForm && vitals.length > 0 && latest && (
        <div>
          <div className="mb-1 text-[10px] text-slate-500">
            {formatDateTime(latest.measured_at)}
          </div>

          <div className="space-y-0.5 rounded-lg border border-slate-100 bg-slate-50 p-2">
            {latest.systolic && latest.diastolic && (
              <VitalRow
                icon={Activity}
                label="Blood Pressure"
                value={`${latest.systolic}/${latest.diastolic}`}
                unit="mmHg"
              />
            )}
            {latest.heart_rate && (
              <VitalRow
                icon={HeartPulse}
                label="Heart Rate"
                value={latest.heart_rate}
                unit="bpm"
              />
            )}
            {latest.temp_c && (
              <VitalRow
                icon={Thermometer}
                label="Temperature"
                value={latest.temp_c}
                unit="°C"
              />
            )}
            {latest.spo2 && (
              <VitalRow
                icon={Droplets}
                label="SpO₂"
                value={latest.spo2}
                unit="%"
              />
            )}
            {latest.resp_rate && (
              <VitalRow
                icon={Activity}
                label="Respiratory Rate"
                value={latest.resp_rate}
                unit="br/min"
              />
            )}
            {latest.overall && (
              <div className="mt-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">Overall Status</span>
                  <VitalBadge value={latest.overall} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Previous readings */}
      {!showForm && vitals.length > 1 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-slate-400" />
            <span className="text-xs font-medium text-slate-700">Recent History</span>
          </div>

          <div className="space-y-1.5">
            {vitals.slice(1, 4).map((vital, idx) => (
              <div
                key={vital.id || idx}
                className="rounded-lg border border-slate-100 bg-white p-2"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDateTime(vital.measured_at)}
                  </span>
                  {vital.overall && <VitalBadge value={vital.overall} />}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                  {vital.systolic && vital.diastolic && (
                    <div className="text-slate-700">
                      BP: <span className="font-medium">{vital.systolic}/{vital.diastolic}</span>
                    </div>
                  )}
                  {vital.heart_rate && (
                    <div className="text-slate-700">
                      HR: <span className="font-medium">{vital.heart_rate}</span>
                    </div>
                  )}
                  {vital.temp_c && (
                    <div className="text-slate-700">
                      Temp: <span className="font-medium">{vital.temp_c}°C</span>
                    </div>
                  )}
                  {vital.spo2 && (
                    <div className="text-slate-700">
                      SpO₂: <span className="font-medium">{vital.spo2}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no vitals and form is closed */}
      {!showForm && vitals.length === 0 && (
        <div className="text-xs text-slate-500">
          No vitals recorded yet. Click "Add Vitals" to record the first reading.
        </div>
      )}
    </div>
  );
}