// app/provider/imaging/new/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { createImagingRequest } from "@/lib/imagingActions";

const PRIORITY_OPTIONS = [
  { value: "ROUTINE", label: "Routine" },
  { value: "URGENT", label: "Urgent" },
  { value: "STAT", label: "Stat" },
];

export default function ProviderNewImagingRequestPage() {
  const router = useRouter();

  const [patientId, setPatientId] = useState("");
  const [procedureCode, setProcedureCode] = useState("");
  const [priority, setPriority] = useState("ROUTINE");
  const [notes, setNotes] = useState("");

  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

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

    fetchPatients();
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

    const payload = {
      patient,
      priority: priority || "ROUTINE",
      items: [
        {
          procedure_code: procedureCode.trim(), // must match ImagingProcedure.code
        },
      ],
    };

    if (notes.trim()) {
      payload.note = notes.trim();
    }

    // Provider is inferred from JWT (ordered_by / requested_by), so we don't send provider explicitly.
    setIsSubmitting(true);
    try {
      await createImagingRequest(payload);
      router.push("/provider/imaging");
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
    <main className="mx-auto max-w-3xl p-6 md:p-10">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          New imaging request
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Request an imaging procedure (e.g. X-ray, CT, MRI) for a patient.
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

        {/* Patient */}
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
            Only patients visible to your facility / account are listed.
          </p>
        </div>

        {/* Procedure code */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Procedure code
          </label>
          <input
            type="text"
            value={procedureCode}
            onChange={(e) => setProcedureCode(e.target.value)}
            placeholder="e.g. CHEST_XRAY, ABDOMINAL_US"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            Must match an existing imaging procedure in the catalogue
            (ImagingProcedure.code).
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
            Clinical note (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Provide clinical context or special instructions for imaging."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/provider/imaging")}
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
            {isSubmitting ? "Creating…" : "Create imaging request"}
          </button>
        </div>
      </form>
    </main>
  );
}
