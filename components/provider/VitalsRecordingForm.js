"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Loader2, PlusCircle, CheckCircle2 } from "lucide-react";

export default function VitalsRecordingForm({ patientId, onSuccess }) {
  const [vitals, setVitals] = useState({
    systolic: "",
    diastolic: "",
    heart_rate: "",
    temp_c: "",
    resp_rate: "",
    spo2: "",
    weight_kg: "",
    height_cm: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setVitals((prev) => ({ ...prev, [name]: value }));
    // Clear messages when user starts typing
    if (error) setError("");
    if (success) setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const payload = {
        patient: patientId,
        measured_at: new Date().toISOString(),
      };

      // Add vitals only if they have values
      if (vitals.systolic) payload.systolic = parseInt(vitals.systolic);
      if (vitals.diastolic) payload.diastolic = parseInt(vitals.diastolic);
      if (vitals.heart_rate) payload.heart_rate = parseInt(vitals.heart_rate);
      if (vitals.temp_c) payload.temp_c = parseFloat(vitals.temp_c);
      if (vitals.resp_rate) payload.resp_rate = parseInt(vitals.resp_rate);
      if (vitals.spo2) payload.spo2 = parseInt(vitals.spo2);
      if (vitals.weight_kg) payload.weight_kg = parseFloat(vitals.weight_kg);
      if (vitals.height_cm) payload.height_cm = parseFloat(vitals.height_cm);

      await apiFetch(`/vitals/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess(true);
      // Reset form
      setVitals({
        systolic: "",
        diastolic: "",
        heart_rate: "",
        temp_c: "",
        resp_rate: "",
        spo2: "",
        weight_kg: "",
        height_cm: "",
      });

      // Call success callback if provided
      if (onSuccess) onSuccess();

      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error recording vitals:", err);
      setError(err?.message || "Error recording vitals.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Messages */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Vitals recorded successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Blood Pressure */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Systolic (mmHg)
            </label>
            <input
              type="number"
              name="systolic"
              value={vitals.systolic}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="120"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Diastolic (mmHg)
            </label>
            <input
              type="number"
              name="diastolic"
              value={vitals.diastolic}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="80"
            />
          </div>
        </div>

        {/* Heart Rate & Temperature */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Heart Rate (bpm)
            </label>
            <input
              type="number"
              name="heart_rate"
              value={vitals.heart_rate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="72"
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
              value={vitals.temp_c}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="36.5"
            />
          </div>
        </div>

        {/* Respiratory Rate & SpO2 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Resp. Rate (br/min)
            </label>
            <input
              type="number"
              name="resp_rate"
              value={vitals.resp_rate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="16"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              SpO₂ (%)
            </label>
            <input
              type="number"
              name="spo2"
              value={vitals.spo2}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="98"
            />
          </div>
        </div>

        {/* Weight & Height */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              name="weight_kg"
              value={vitals.weight_kg}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="70.5"
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
              value={vitals.height_cm}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="175"
            />
          </div>
        </div>

        {/* Info & Submit */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <span className="text-[10px] text-slate-500">
            Only fields with values will be saved.
          </span>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4" />
                Submit vitals
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}