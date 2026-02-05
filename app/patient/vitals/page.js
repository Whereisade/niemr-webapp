"use client";

import { Suspense } from "react";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useVitals } from "@/lib/useVitals";
import {
  HeartPulse,
  Thermometer,
  Droplets,
  Gauge,
  Clock,
  Filter,
  ArrowLeft,
  ArrowRight,
  Activity,
} from "lucide-react";


export default function PatientVitalsPage(props) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <PatientVitalsPageInner {...props} />
    </Suspense>
  );
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

function PatientVitalsPageInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page  = Number(sp.get("page") || 1);
  const limit = Number(sp.get("limit") || 20);

  // Backend scopes vitals by PATIENT for patient role automatically
  const { data, error, isLoading } = useVitals({ page, limit });

  const rows = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
  const total = Number(data?.count ?? rows.length);

  const updateQuery = (patch) => {
    const params = new URLSearchParams(sp?.toString() || "");
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") params.delete(k);
      else params.set(k, String(v));
    });
    if ("limit" in patch) params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  if (isLoading && !data) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-4">My Vitals</h1>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 -mt-6 mb-4 rounded-t-xl" />
          <p className="text-slate-500">Loading vitals…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-4">My Vitals</h1>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Failed to load: {error.message || "Unknown error"}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6 md:p-10 space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <HeartPulse className="h-3.5 w-3.5" />
            Patient Portal
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            My Vitals
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track your blood pressure, heart rate, temperature, oxygen saturation, and more over time.
          </p>
        </div>

        {/* Page size selector */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <select
              className="w-full appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-8 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-44"
              value={String(limit)}
              onChange={(e) => updateQuery({ limit: e.target.value })}
            >
              <option value="10">Show 10</option>
              <option value="20">Show 20</option>
              <option value="50">Show 50</option>
            </select>
            <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </header>

      {/* Quick stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Activity}   label="Records on page" value={rows.length} accent="from-emerald-600 via-teal-600 to-cyan-600" />
        <StatTile icon={Gauge}      label="Total (all pages)" value={total} accent="from-fuchsia-600 via-pink-600 to-rose-600" />
        <StatTile icon={Clock}      label="Most recent reading" value={rows[0]?.measured_at ? formatDateTime(rows[0]?.measured_at) : "—"} accent="from-amber-600 via-orange-600 to-red-600" isText />
        <StatTile icon={HeartPulse} label="Avg. Heart Rate" value={avg(rows.map(r => r.heart_rate)) ?? "—"} accent="from-blue-600 via-indigo-600 to-violet-600" isText />
      </section>

      {/* Table (desktop) */}
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <Th>Measured At</Th>
              <Th>BP (mmHg)</Th>
              <Th>HR (bpm)</Th>
              <Th>Temp (°C)</Th>
              <Th>SpO₂ (%)</Th>
              <Th>BMI</Th>
              <Th>Overall</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((v) => (
              <tr key={v.id} className="transition hover:bg-slate-50/60">
                <Td>
                  <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                    {formatDateTime(v.measured_at)}
                  </span>
                </Td>
                <Td>
                  <Metric icon={Activity} value={v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : "—"} />
                </Td>
                <Td>
                  <Metric icon={HeartPulse} value={v.heart_rate ?? "—"} />
                </Td>
                <Td>
                  <Metric icon={Thermometer} value={v.temp_c ?? "—"} />
                </Td>
                <Td>
                  <Metric icon={Droplets} value={v.spo2 ?? "—"} />
                </Td>
                <Td>
                  <Metric icon={Gauge} value={v.bmi ?? "—"} />
                </Td>
                <Td>
                  <OverallPill value={v.overall} />
                </Td>
              </tr>
            ))}

            {!rows.length && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
                    <Activity className="h-6 w-6 text-slate-400" />
                  </div>
                  <div className="text-sm font-medium text-slate-900">No vitals recorded yet</div>
                  <div className="mt-1 text-sm text-slate-500">New readings will appear here automatically.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile/tablet) */}
      <div className="space-y-3 lg:hidden">
        {rows.map((v) => (
          <div key={v.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Measured At</div>
                <div className="mt-1 text-sm text-slate-800">
                  {formatDateTime(v.measured_at)}
                </div>
              </div>
              <OverallPill value={v.overall} />
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-3">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">BP</div>
                <Metric icon={Activity} value={v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : "â€”"} />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">HR</div>
                <Metric icon={HeartPulse} value={v.heart_rate ?? "â€”"} />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Temp</div>
                <Metric icon={Thermometer} value={v.temp_c ?? "â€”"} />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">SpOâ‚‚</div>
                <Metric icon={Droplets} value={v.spo2 ?? "â€”"} />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">BMI</div>
                <Metric icon={Gauge} value={v.bmi ?? "â€”"} />
              </div>
            </div>
          </div>
        ))}

        {!rows.length && (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
              <Activity className="h-6 w-6 text-slate-400" />
            </div>
            <div className="text-sm font-medium text-slate-900">No vitals recorded yet</div>
            <div className="mt-1 text-sm text-slate-500">New readings will appear here automatically.</div>
          </div>
        )}
      </div>

      {/* Pager */}
      <div className="flex items-center justify-between pt-2 text-sm text-slate-600">
        <div>Page {page} · {total} total</div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => updateQuery({ page: page - 1 })}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 shadow-sm hover:border-slate-300 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            type="button"
            disabled={rows.length < limit}
            onClick={() => updateQuery({ page: page + 1 })}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 shadow-sm hover:border-slate-300 disabled:opacity-50"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </main>
  );
}

/* ─────────────── UI helpers (UI-only) ─────────────── */

function StatTile({ icon: Icon, label, value, accent, isText = false }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">{label}</div>
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
            <Icon className="h-5 w-5 text-slate-700" />
          </div>
        </div>
        <div className={`mt-2 ${isText ? "text-slate-900" : "text-3xl font-semibold text-slate-900"}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function OverallPill({ value }) {
  const v = String(value || "").toLowerCase();
  const map = {
    normal: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
    critical: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  const cls = map[v] || "bg-slate-50 text-slate-700 ring-slate-200";
  const label = value || "—";
  return <span className={`inline-flex items-center rounded-lg px-2 py-1 text-xs ring-1 ${cls}`}>{label}</span>;
}

function Metric({ icon: Icon, value }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
      <Icon className="h-3.5 w-3.5 text-slate-500" />
      {value}
    </span>
  );
}

function Th({ children }) {
  return (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
      {children}
    </th>
  );
}
function Td({ children }) {
  return <td className="p-3 text-sm text-slate-800">{children}</td>;
}

/* small helper for average (ignores null/undefined/NaN) */
function avg(arr) {
  const nums = (arr || []).map((n) => Number(n)).filter((n) => Number.isFinite(n));
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}
