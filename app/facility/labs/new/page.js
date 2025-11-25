"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { createLabOrder } from "@/lib/labsActions";

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

  // Lookup data
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
        if (!cancelled) {
          setPatients([]);
        }
      } finally {
        if (!cancelled) setLoadingPatients(false);
      }
    }

    async function fetchProviders() {
      try {
        setLoadingProviders(true);
        const res = await apiFetch("/providers/?page=1&limit=50");
        if (cancelled) return;
        const items = Array.isArray(res) ? res : res?.results || [];
        setProviders(items);
      } catch (err) {
        console.error("Failed to load providers", err);
        if (!cancelled) {
          setProviders([]);
        }
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

  return (
    <main className="mx-auto max-w-3xl p-6 md:p-10">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          New lab order
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Create a lab request for a patient in this facility.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Patient select */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Patient
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
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Provider (optional)
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
            You can assign a provider now, or leave blank and let the facility
            assign later.
          </p>
        </div>

        {/* Test code */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Test code
          </label>
          <input
            type="text"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="e.g. FBC_HB"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            Enter the lab test code; it must match an existing test in the lab
            catalogue (e.g. FBC_HB).
          </p>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
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
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
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

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
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
            disabled={isSubmitting}
            className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? "Creating…" : "Create lab order"}
          </button>
        </div>
      </form>
    </main>
  );
}
