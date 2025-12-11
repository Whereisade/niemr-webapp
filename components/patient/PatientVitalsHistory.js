// components/patient/PatientVitalsHistory.js
"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Activity,
  HeartPulse,
  Thermometer,
  Droplets,
  Gauge,
  Calendar,
  TrendingUp,
  AlertCircle,
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

function OverallBadge({ value }) {
  const v = String(value || "").toUpperCase();
  const config = {
    GREEN: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      ring: "ring-emerald-200",
      label: "Normal",
    },
    YELLOW: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      ring: "ring-amber-200",
      label: "Warning",
    },
    RED: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      ring: "ring-rose-200",
      label: "Critical",
    },
  };
  const style = config[v] || {
    bg: "bg-slate-50",
    text: "text-slate-700",
    ring: "ring-slate-200",
    label: value || "—",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ring-1 ${style.bg} ${style.text} ${style.ring}`}
    >
      {v === "RED" && <AlertCircle className="h-3 w-3" />}
      {style.label}
    </span>
  );
}

function VitalMetric({ icon: Icon, label, value, unit }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
      <div className="flex items-center gap-2">
        <div className="rounded-md bg-white p-1.5">
          <Icon className="h-4 w-4 text-slate-600" />
        </div>
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-900">
        {value || "—"}
        {value && unit && (
          <span className="ml-1 text-xs font-normal text-slate-500">
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

export default function PatientVitalsHistory({ patientId }) {
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patientId) return;

    let cancelled = false;

    async function loadVitals() {
      try {
        setLoading(true);
        setError("");
        const data = await apiFetch(`/vitals/?patient=${patientId}`);
        if (cancelled) return;

        // Handle both paginated and non-paginated responses
        const items = Array.isArray(data) ? data : data?.results || [];
        setVitals(items);
      } catch (err) {
        console.error("Failed to load vitals", err);
        if (!cancelled) {
          setError(
            err?.message || "Failed to load vitals history. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadVitals();

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 -mt-5 -mx-5 mb-4 rounded-t-2xl" />
        <p className="text-sm text-slate-500">Loading vitals history…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (vitals.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 -mt-5 -mx-5 mb-4 rounded-t-2xl" />
        <div className="flex flex-col items-center justify-center py-8">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
            <Activity className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-900">
            No vitals recorded yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Vitals will appear here once recorded by staff
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary card with latest vitals */}
      {vitals[0] && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 -mt-5 -mx-5 mb-4 rounded-t-2xl" />
          
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Latest Vitals
              </h3>
              <p className="text-xs text-slate-500">
                {formatDateTime(vitals[0].measured_at)}
              </p>
            </div>
            <OverallBadge value={vitals[0].overall} />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <VitalMetric
              icon={Activity}
              label="Blood Pressure"
              value={
                vitals[0].systolic && vitals[0].diastolic
                  ? `${vitals[0].systolic}/${vitals[0].diastolic}`
                  : null
              }
              unit="mmHg"
            />
            <VitalMetric
              icon={HeartPulse}
              label="Heart Rate"
              value={vitals[0].heart_rate}
              unit="bpm"
            />
            <VitalMetric
              icon={Thermometer}
              label="Temperature"
              value={vitals[0].temp_c}
              unit="°C"
            />
            <VitalMetric
              icon={Droplets}
              label="SpO₂"
              value={vitals[0].spo2}
              unit="%"
            />
            {vitals[0].bmi && (
              <VitalMetric
                icon={Gauge}
                label="BMI"
                value={vitals[0].bmi}
                unit=""
              />
            )}
            {vitals[0].resp_rate && (
              <VitalMetric
                icon={TrendingUp}
                label="Resp. Rate"
                value={vitals[0].resp_rate}
                unit="br/min"
              />
            )}
          </div>
        </div>
      )}

      {/* History table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600" />
        
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Vitals History
            </h3>
            <span className="text-xs text-slate-500">
              {vitals.length} record{vitals.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date & Time
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  BP
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  HR
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Temp
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  SpO₂
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {vitals.map((vital) => (
                <tr key={vital.id} className="hover:bg-slate-50">
                  <td className="p-3 text-xs text-slate-700">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {formatDateTime(vital.measured_at)}
                    </div>
                  </td>
                  <td className="p-3 text-sm text-slate-800">
                    {vital.systolic && vital.diastolic
                      ? `${vital.systolic}/${vital.diastolic}`
                      : "—"}
                  </td>
                  <td className="p-3 text-sm text-slate-800">
                    {vital.heart_rate || "—"}
                  </td>
                  <td className="p-3 text-sm text-slate-800">
                    {vital.temp_c || "—"}
                  </td>
                  <td className="p-3 text-sm text-slate-800">
                    {vital.spo2 ? `${vital.spo2}%` : "—"}
                  </td>
                  <td className="p-3">
                    <OverallBadge value={vital.overall} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}