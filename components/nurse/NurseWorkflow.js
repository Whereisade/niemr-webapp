"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { DateTime } from "luxon";
import {
  Loader2,
  PlusCircle,
  Activity,
  Thermometer,
  Bell,
} from "lucide-react";

export default function NurseWorkflow({ patientId }) {
  // States for vitals - using proper field names that match backend
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
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderTime, setReminderTime] = useState(DateTime.now().toISO());
  const [reminderError, setReminderError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Handle form changes
  const handleVitalsChange = (e) => {
    const { name, value } = e.target;
    setVitals((prev) => ({ ...prev, [name]: value }));
  };

  const handleReminderChange = (e) => {
    const { name, value } = e.target;
    if (name === "message") setReminderMessage(value);
    if (name === "reminder_time") setReminderTime(value);
  };

  const handleSubmitVitals = async () => {
    setLoading(true);
    setReminderError("");
    setSuccessMessage("");

    try {
      // Build payload with required fields
      const payload = {
        patient: patientId,
        measured_at: new Date().toISOString(),
      };

      // Add vitals only if they have values (convert to numbers for numeric fields)
      if (vitals.systolic) payload.systolic = parseInt(vitals.systolic);
      if (vitals.diastolic) payload.diastolic = parseInt(vitals.diastolic);
      if (vitals.heart_rate) payload.heart_rate = parseInt(vitals.heart_rate);
      if (vitals.temp_c) payload.temp_c = parseFloat(vitals.temp_c);
      if (vitals.resp_rate) payload.resp_rate = parseInt(vitals.resp_rate);
      if (vitals.spo2) payload.spo2 = parseInt(vitals.spo2);
      if (vitals.weight_kg) payload.weight_kg = parseFloat(vitals.weight_kg);
      if (vitals.height_cm) payload.height_cm = parseFloat(vitals.height_cm);

      const response = await apiFetch(`/vitals/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccessMessage("Vitals recorded successfully.");
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
    } catch (error) {
      console.error("Error recording vitals:", error);
      setReminderError(error?.message || "Error recording vitals.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReminder = async () => {
    setLoading(true);
    setReminderError("");
    setSuccessMessage("");

    try {
      const response = await apiFetch(`/notifications/reminders/`, {
        method: "POST",
        body: JSON.stringify({
          patient: patientId,
          message: reminderMessage,
          reminder_time: reminderTime,
        }),
      });
      setSuccessMessage("Reminder set successfully.");
      setReminderMessage("");
    } catch (error) {
      console.error("Error setting reminder:", error);
      setReminderError(error?.message || "Error setting reminder.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
      {/* Gradient strip */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
              <Activity className="h-3 w-3" />
              Nurse workflow
            </div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900 md:text-lg">
              Bedside actions for this patient
            </h2>
            <p className="max-w-xl text-xs text-slate-500">
              Record vitals and set reminders for this patient.
            </p>
          </div>

          {patientId && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] text-slate-600">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600/10 text-[10px] font-semibold text-blue-700">
                PT
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-slate-900">
                  Patient ID: {patientId}
                </span>
                <span className="text-[9px] text-slate-500">
                  All actions are linked to this patient.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Global error/success messages */}
        <div className="space-y-2">
          {reminderError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {reminderError}
            </div>
          )}
          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}
        </div>

        {/* Main grid: vitals and reminder */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* Vitals Section */}
          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-900">
                  <Thermometer className="h-4 w-4 text-blue-600" />
                  Record vitals
                </h3>
                <p className="mt-1 text-[10px] text-slate-500">
                  Capture the latest bedside observations for this encounter.
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-medium text-slate-500 shadow-sm">
                Auto timestamps on save
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Blood pressure &mdash; systolic (mmHg)
                </label>
                <input
                  type="number"
                  name="systolic"
                  value={vitals.systolic}
                  onChange={handleVitalsChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g. 120"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Blood pressure &mdash; diastolic (mmHg)
                </label>
                <input
                  type="number"
                  name="diastolic"
                  value={vitals.diastolic}
                  onChange={handleVitalsChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g. 80"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Heart rate (bpm)
                </label>
                <input
                  type="number"
                  name="heart_rate"
                  value={vitals.heart_rate}
                  onChange={handleVitalsChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g. 72"
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
                  onChange={handleVitalsChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g. 36.5"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Respiratory rate (breaths/min)
                </label>
                <input
                  type="number"
                  name="resp_rate"
                  value={vitals.resp_rate}
                  onChange={handleVitalsChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g. 16"
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
                  onChange={handleVitalsChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g. 98"
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
                  value={vitals.weight_kg}
                  onChange={handleVitalsChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g. 70.5"
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
                  onChange={handleVitalsChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g. 175"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 text-[10px] text-slate-500">
              <span>Only fields with values will be saved.</span>
              <button
                onClick={handleSubmitVitals}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {!loading && (
                  <PlusCircle className="h-4 w-4" />
                )}
                {loading ? "Submitting…" : "Submit vitals"}
              </button>
            </div>
          </section>

          {/* Reminder Section */}
          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-900">
                  <Bell className="h-4 w-4 text-amber-600" />
                  Set a reminder
                </h3>
                <p className="mt-1 text-[10px] text-slate-500">
                  Create a follow-up reminder linked to this patient.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="message"
                  className="mb-1 block text-xs font-medium text-slate-600"
                >
                  Reminder message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  value={reminderMessage}
                  onChange={handleReminderChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="e.g. Recheck vitals in 4 hours, follow up on lab results, dressing change due, etc."
                />
              </div>
              <div>
                <label
                  htmlFor="reminder_time"
                  className="mb-1 block text-xs font-medium text-slate-600"
                >
                  Reminder time
                </label>
                <input
                  type="datetime-local"
                  name="reminder_time"
                  value={reminderTime}
                  onChange={handleReminderChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Reminder will be delivered according to your facility&apos;s
                  notification preferences.
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSubmitReminder}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {!loading && <PlusCircle className="h-4 w-4" />}
                {loading ? "Submitting…" : "Set reminder"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}