"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { createImagingRequest } from "@/lib/imagingActions";
import { ScanLine, AlertCircle } from "lucide-react";

const PRIORITY_OPTIONS = [
  { value: "ROUTINE", label: "Routine" },
  { value: "URGENT", label: "Urgent" },
  { value: "STAT", label: "Stat" },
];

export default function FacilityNewImagingRequestPage() {
  const router = useRouter();

  const [patientId, setPatientId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [procedureCode, setProcedureCode] = useState("");
  const [priority, setPriority] = useState("ROUTINE");
  const [notes, setNotes] = useState("");

  const [patients, setPatients] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchPatients() {
      try {
        setLoadingPatients(true);
        const res = await apiFetch("/patients/?page=1&limit=50");
        if (cancelled) return;
        const items = Array.isArray(res) ? res : res?.results || [];
        setPatients(items);
      } catch (err) {
        console.error("Failed to load patients", err);
        if (!cancelled) setPatients([]);
      } finally {
        if (!cancelled) setLoadingPatients(false);
      }
    }

    async function fetchProviders() {
      try {
        setLoadingProviders(true);
        const res = await apiFetch("/providers/?facility=current&type=LAB_SCIENTIST&page=1&limit=50");
        if (cancelled) return;
        const items = Array.isArray(res) ? res : res?.results || [];
        setProviders(items);
      } catch (err) {
        console.error("Failed to load providers", err);
        if (!cancelled) setProviders([]);
      } finally {
        if (!cancelled) setLoadingProviders(false);
      }
    }

    fetchPatients();
    fetchProviders();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const patient = Number(patientId);
    if (!patient || Number.isNaN(patient)) {
      if (!loadingPatients && patients.length === 0) {
        setError(
          "No patients are available. Please create a patient profile first before requesting imaging."
        );
      } else {
        setError("Please select a patient.");
      }
      return;
    }

    if (!procedureCode.trim()) {
      setError("Please enter the imaging procedure code.");
      return;
    }

    // 🔧 KEY PATCH: send `procedure` instead of `items[*].procedure_code`
    const payload = {
      patient,
      procedure_code: procedureCode.trim(), // backend expects `procedure`
      priority: priority || "ROUTINE",
    };

    const provider = Number(providerId);
    if (provider && !Number.isNaN(provider)) {
      payload.provider = provider;
    }

    if (notes.trim()) {
      payload.note = notes.trim();
    }

    setIsSubmitting(true);
    try {
      await createImagingRequest(payload);
      router.push("/facility/imaging");
    } catch (err) {
      console.error("Create imaging request failed", err);
      setError(
        err?.message ||
          "Failed to create imaging request. Please check the fields and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative mx-auto max-w-4xl p-6 md:p-10">
      {/* Soft background glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100/70 blur-3xl" />

      {/* Header */}
      <header className="relative mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
          <ScanLine className="h-3.5 w-3.5" />
          Facility · Imaging
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          New imaging request
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Create an imaging request for a patient in this facility. Use the
          catalogue procedure code so the imaging team can process it
          correctly.
        </p>
      </header>

      {/* Main card */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

        <form onSubmit={handleSubmit} className="space-y-6 p-6 md:p-7">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Patient + provider row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Patient */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="block text-sm font-medium text-slate-800">
                  Patient
                </label>
                <span className="text-[11px] font-medium text-rose-600">
                  Required
                </span>
              </div>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">
                  {loadingPatients
                    ? "Loading patients…"
                    : patients.length
                    ? "Select patient"
                    : "No patients found"}
                </option>
                {!loadingPatients &&
                  patients.map((p) => {
                    const fullName = [p.first_name, p.last_name]
                      .filter(Boolean)
                      .join(" ");
                    const label = fullName || p.email || `Patient #${p.id}`;
                    return (
                      <option key={p.id} value={String(p.id)}>
                        {label}
                      </option>
                    );
                  })}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Patients are limited to those associated with this facility.
              </p>
            </div>

            {/* Provider */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="block text-sm font-medium text-slate-800">
                  Provider (optional)
                </label>
                <span className="text-[11px] text-slate-400">
                  Leave blank to assign later
                </span>
              </div>
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">
                  {loadingProviders
                    ? "Loading providers…"
                    : providers.length
                    ? "Select provider"
                    : "No providers found"}
                </option>
                {!loadingProviders &&
                  providers.map((p) => {
                    const fullName = [p.first_name, p.last_name]
                      .filter(Boolean)
                      .join(" ");
                    const label =
                      fullName || p.email || p.user || `Provider #${p.id}`;
                    return (
                      <option key={p.id} value={String(p.id)}>
                        {label}
                      </option>
                    );
                  })}
              </select>
            </div>
          </div>

          {/* Procedure + priority */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Procedure code */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="block text-sm font-medium text-slate-800">
                  Procedure code
                </label>
                <span className="text-[11px] font-medium text-rose-600">
                  Required
                </span>
              </div>
              <input
                type="text"
                value={procedureCode}
                onChange={(e) => setProcedureCode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. CXR, ABDO_US, CT_HEAD"
              />
              <p className="mt-1 text-xs text-slate-500">
                Use the catalogue procedure code configured in the imaging
                setup.
              </p>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-slate-800">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-800">
              Clinical notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Add any relevant clinical details or questions for the imaging team…"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center rounded-full bg-blue-600 px-5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? "Creating…" : "Create imaging request"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
