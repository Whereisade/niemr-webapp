"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { createLabOrder } from "@/lib/labsActions";
import {
  Beaker,
  Activity,
  AlertTriangle,
  UserRound,
  Stethoscope,
  FileText,
  ArrowLeft,
} from "lucide-react";

const PRIORITY_OPTIONS = [
  { value: "ROUTINE", label: "Routine" },
  { value: "URGENT", label: "Urgent" },
  { value: "STAT", label: "Stat" },
];

export default function FacilityNewLabOrderPage() {
  const router = useRouter();

  // Form state
  const [patientId, setPatientId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [testName, setTestName] = useState("");
  const [priority, setPriority] = useState("ROUTINE");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Lookup data (no TypeScript generics)
  const [patients, setPatients] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);

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

  const selectedPatientLabel = useMemo(() => {
    if (!patientId) return "No patient selected yet";
    const p = patients.find((x) => String(x.id) === String(patientId));
    if (!p) return "Patient not found in current list";
    const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ");
    return fullName || p.email || `Patient #${p.id}`;
  }, [patientId, patients]);

  const selectedProviderLabel = useMemo(() => {
    if (!providerId) return "Any available provider";
    const p = providers.find((x) => String(x.id) === String(providerId));
    if (!p) return "Provider not found in current list";
    const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ");
    const roleOrSpec = p.specialty || p.role || "";
    return `${fullName || p.email || `Provider #${p.id}`}${
      roleOrSpec ? ` – ${roleOrSpec}` : ""
    }`;
  }, [providerId, providers]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const patient = Number(patientId);
    if (!patient || Number.isNaN(patient)) {
      if (!loadingPatients && patients.length === 0) {
        setError(
          "No patients are available. Please create a patient profile first before ordering labs."
        );
      } else {
        setError("Please select a patient.");
      }
      return;
    }

    if (!testName.trim()) {
      setError("Please enter the lab test code.");
      return;
    }

    // Backend expects: { patient, priority, note?, items: [{ test_code }] }
    const payload = {
      patient,
      priority: priority || "ROUTINE",
      items: [
        {
          // This must match LabTest.code in the catalog
          test_code: testName.trim(),
        },
      ],
    };

    const provider = Number(providerId);
    if (provider && !Number.isNaN(provider)) {
      payload.provider = provider; // optional
    }

    if (notes.trim()) {
      payload.note = notes.trim(); // backend field is singular "note"
    }

    setIsSubmitting(true);
    try {
      await createLabOrder(payload);
      router.push("/facility/labs");
    } catch (err) {
      console.error("Create lab order failed", err);
      setError(
        err?.message ||
          "Failed to create lab order. Please check the fields and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    !isSubmitting &&
    !!patientId &&
    !!testName.trim() &&
    !loadingPatients &&
    patients.length > 0;

  return (
    <main className="relative mx-auto max-w-5xl p-6 md:p-10">
      {/* Soft background accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100 blur-3xl opacity-60" />

      {/* Header */}
      <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <Beaker className="h-3.5 w-3.5" />
            Facility · New Lab Order
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Create a new lab request
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Order one or more lab tests for a patient in this facility. You can
            assign a provider and set priority for the lab team.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/facility/labs")}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to lab orders
        </button>
      </header>

      {/* Content: form + summary */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="md:col-span-2 space-y-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

          <div className="p-6 space-y-6">
            {error && (
              <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Patient select */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Patient <span className="text-rose-500">*</span>
              </label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                Patients are limited to those visible to this facility.
              </p>
            </div>

            {/* Provider select (optional) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Requesting provider (optional)
              </label>
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">
                  {loadingProviders
                    ? "Loading providers…"
                    : "Any available provider"}
                </option>
                {!loadingProviders &&
                  providers.map((p) => {
                    const fullName = [p.first_name, p.last_name]
                      .filter(Boolean)
                      .join(" ");
                    const roleOrSpec = p.specialty || p.role || "";
                    const label = fullName || p.email || `Provider #${p.id}`;
                    return (
                      <option key={p.id} value={String(p.id)}>
                        {label}
                        {roleOrSpec ? ` – ${roleOrSpec}` : ""}
                      </option>
                    );
                  })}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                You can assign a provider now, or leave blank and let the
                facility assign later.
              </p>
            </div>

            {/* Test code & priority in grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Test code */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Test code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="e.g. FBC_HB"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Must match an existing test in the lab catalogue (e.g.{" "}
                  <span className="font-mono">FBC_HB</span>).
                </p>
              </div>

              {/* Priority */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Urgent / Stat orders are highlighted for the lab team.
                </p>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Clinical notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Provide context or special instructions for the lab team."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-3">
            <button
              type="button"
              onClick={() => router.push("/facility/labs")}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              <FileText className="mr-2 h-4 w-4" />
              {isSubmitting ? "Creating…" : "Create lab order"}
            </button>
          </div>
        </form>

        {/* Order summary */}
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500" />
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50">
                  <Activity className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Order summary
                  </h2>
                  <p className="text-xs text-slate-500">
                    Preview the details before submitting to the lab.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <SummaryRow
                  label="Patient"
                  icon={UserRound}
                  value={selectedPatientLabel}
                />
                <SummaryRow
                  label="Provider"
                  icon={Stethoscope}
                  value={selectedProviderLabel}
                />
                <SummaryRow
                  label="Test code"
                  icon={Beaker}
                  value={testName || "No test code entered yet"}
                  code
                />
                <SummaryRow
                  label="Priority"
                  icon={AlertTriangle}
                  value={
                    PRIORITY_OPTIONS.find((p) => p.value === priority)?.label ||
                    priority
                  }
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600">
            <p className="mb-1 font-semibold text-slate-800">
              Helpful tips for lab orders
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>
                Ensure the test code matches the lab catalogue exactly (no
                spaces, correct case).
              </li>
              <li>
                Add short clinical notes when the reason for the test is not
                obvious.
              </li>
              <li>
                Use <span className="font-medium">Stat</span> only when results
                are needed immediately for clinical decisions.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

/* ─────────────── UI helpers ─────────────── */

function SummaryRow({ label, value, icon: Icon, code = false }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
      <div className="mt-0.5 grid h-6 w-6 place-items-center rounded-md bg-white border border-slate-200">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
      </div>
      <div className="flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div
          className={`mt-0.5 text-xs ${
            code ? "font-mono text-slate-800" : "text-slate-800"
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
