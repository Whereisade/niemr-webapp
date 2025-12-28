// components/patient/PatientVitalsHistory.js
"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Activity,
  HeartPulse,
  Thermometer,
  Droplets,
  Calendar,
  AlertCircle,
  TrendingUp,
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
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium ring-1 ${style.bg} ${style.text} ${style.ring}`}
    >
      {v === "RED" && <AlertCircle className="h-3 w-3" />}
      {style.label}
    </span>
  );
}

export default function PatientVitalsHistory({ patientId }) {
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!patientId) return;

    let cancelled = false;

    async function loadVitals() {
      try {
        setLoading(true);
        setError("");
        const data = await apiFetch(`/vitals/?patient=${patientId}`);
        if (cancelled) return;

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
      <div className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">
        Loading vitals history…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (vitals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-6">
        <Activity className="h-8 w-8 text-slate-300" />
        <p className="mt-2 text-sm font-medium text-slate-600">
          No vitals recorded
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Vitals will appear here once recorded
        </p>
      </div>
    );
  }

  const displayVitals = showAll ? vitals : vitals.slice(0, 3);
  const hasMore = vitals.length > 3;

  return (
    <div className="space-y-3">
      {/* Latest vitals summary */}
      {vitals[0] && (
        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              Latest Reading
            </div>
            <OverallBadge value={vitals[0].overall} />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {vitals[0].systolic && vitals[0].diastolic && (
              <div className="flex items-center gap-1.5">
                <HeartPulse className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-slate-600">BP:</span>
                <span className="font-semibold text-slate-900">
                  {vitals[0].systolic}/{vitals[0].diastolic}
                </span>
              </div>
            )}
            {vitals[0].heart_rate && (
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-red-500" />
                <span className="text-slate-600">HR:</span>
                <span className="font-semibold text-slate-900">
                  {vitals[0].heart_rate} bpm
                </span>
              </div>
            )}
            {vitals[0].temp_c && (
              <div className="flex items-center gap-1.5">
                <Thermometer className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-slate-600">Temp:</span>
                <span className="font-semibold text-slate-900">
                  {vitals[0].temp_c}°C
                </span>
              </div>
            )}
            {vitals[0].spo2 && (
              <div className="flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-slate-600">SpO₂:</span>
                <span className="font-semibold text-slate-900">
                  {vitals[0].spo2}%
                </span>
              </div>
            )}
            {vitals[0].resp_rate && (
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-slate-600">RR:</span>
                <span className="font-semibold text-slate-900">
                  {vitals[0].resp_rate} br/min
                </span>
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
            <Calendar className="h-3 w-3" />
            {formatDateTime(vitals[0].measured_at)}
          </div>
        </div>
      )}

      {/* History list */}
      {vitals.length > 1 && (
        <div className="space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            Previous Readings
          </div>
          
          {displayVitals.slice(1).map((vital) => (
            <div
              key={vital.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-2 text-xs hover:bg-slate-50"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-slate-600">
                  {new Date(vital.measured_at).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {vital.systolic && vital.diastolic && (
                  <span className="text-slate-700">
                    {vital.systolic}/{vital.diastolic}
                  </span>
                )}
                {vital.heart_rate && (
                  <span className="text-slate-700">{vital.heart_rate} bpm</span>
                )}
                <OverallBadge value={vital.overall} />
              </div>
            </div>
          ))}

          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {showAll ? "Show less" : `Show all ${vitals.length} readings`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}