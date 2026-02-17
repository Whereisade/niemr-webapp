"use client";

import { Suspense, useState } from "react";

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
  Plus,
  X,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import { apiFetch } from "@/lib/api";


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
  const { data, error, isLoading, mutate } = useVitals({ page, limit });

  // Self-report form
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

  const rows = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
  const total = Number(data?.count ?? rows.length);

  const handleVitalsChange = (e) => {
    const { name, value } = e.target;
    setVitalsForm((prev) => ({ ...prev, [name]: value }));
  };

  async function handleSubmitVitals(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const payload = {};
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

      setSubmitSuccess("Vitals saved successfully!");
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
      await mutate();

      setTimeout(() => {
        setShowForm(false);
        setSubmitSuccess("");
      }, 1500);
    } catch (err) {
      setSubmitError(err?.message || "Failed to save vitals.");
    } finally {
      setSubmitting(false);
    }
  }

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

      {/* Self-report vitals */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Self-report vitals</div>
            <div className="mt-1 text-xs text-slate-500">
              You can record any vitals you have measured at home (you don’t need to fill every field).
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
          >
            {showForm ? (
              <>
                <X className="h-4 w-4" />
                Close
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add vitals
              </>
            )}
          </button>
        </div>

        {showForm && (
          <div className="px-5 py-4">
            {submitSuccess && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                {submitSuccess}
              </div>
            )}
            {submitError && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitVitals} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InputField label="Systolic BP" name="systolic" placeholder="120" value={vitalsForm.systolic} onChange={handleVitalsChange} />
                <InputField label="Diastolic BP" name="diastolic" placeholder="80" value={vitalsForm.diastolic} onChange={handleVitalsChange} />
                <InputField label="Heart Rate (bpm)" name="heart_rate" placeholder="72" value={vitalsForm.heart_rate} onChange={handleVitalsChange} />
                <InputField label="Temperature (°C)" name="temp_c" placeholder="36.5" step="0.1" value={vitalsForm.temp_c} onChange={handleVitalsChange} />
                <InputField label="Resp Rate" name="resp_rate" placeholder="16" value={vitalsForm.resp_rate} onChange={handleVitalsChange} />
                <InputField label="SpO₂ (%)" name="spo2" placeholder="98" value={vitalsForm.spo2} onChange={handleVitalsChange} />
                <InputField label="Weight (kg)" name="weight_kg" placeholder="70" step="0.1" value={vitalsForm.weight_kg} onChange={handleVitalsChange} />
                <InputField label="Height (cm)" name="height_cm" placeholder="175" step="0.1" value={vitalsForm.height_cm} onChange={handleVitalsChange} />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Only the fields you fill will be saved.</span>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

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
              <Th>Source</Th>
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
                  <SourcePill value={v.source} />
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
                <td colSpan={8} className="px-4 py-10 text-center">
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
                <div className="mt-2">
                  <SourcePill value={v.source} />
                </div>
              </div>
              <OverallPill value={v.overall} />
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-3">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">BP</div>
                <Metric icon={Activity} value={v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : "—"} />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">HR</div>
                <Metric icon={HeartPulse} value={v.heart_rate ?? "—"} />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Temp</div>
                <Metric icon={Thermometer} value={v.temp_c ?? "—"} />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">SpO₂</div>
                <Metric icon={Droplets} value={v.spo2 ?? "—"} />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">BMI</div>
                <Metric icon={Gauge} value={v.bmi ?? "—"} />
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

function SourcePill({ value }) {
  const v = String(value || "").toUpperCase();
  const map = {
    PATIENT: { cls: "bg-blue-50 text-blue-700 ring-blue-200", label: "Patient" },
    PROVIDER: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", label: "Provider" },
    FACILITY: { cls: "bg-indigo-50 text-indigo-700 ring-indigo-200", label: "Facility" },
  };
  const item = map[v] || { cls: "bg-slate-50 text-slate-700 ring-slate-200", label: value || "—" };
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-1 text-xs ring-1 ${item.cls}`}>
      {item.label}
    </span>
  );
}

function InputField({ label, name, value, onChange, placeholder, step }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        step={step}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  );
}

/* small helper for average (ignores null/undefined/NaN) */
function avg(arr) {
  const nums = (arr || []).map((n) => Number(n)).filter((n) => Number.isFinite(n));
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}
