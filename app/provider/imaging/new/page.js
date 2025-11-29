"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { createImagingRequest } from "@/lib/imagingActions";
import {
  Image as ImageIcon,
  AlertTriangle,
  ClipboardList,
  Loader2,
} from "lucide-react";

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

    // Provider is inferred from JWT (ordered_by / requested_by)
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

  const canSubmit =
    !isSubmitting &&
    !!patientId &&
    !!procedureCode.trim() &&
    !loadingPatients &&
    patients.length > 0;

  return (
    <main className="relative mx-auto max-w-4xl p-6 md:p-10">
      {/* Soft background glows */}
      <div className="pointer-events-none absolute -top-28 -left-24 h-64 w-64 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-64 w-64 rounded-full bg-indigo-100/60 blur-3xl" />

      {/* Header */}
      <header className="relative mb-6 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
          <ImageIcon className="h-3.5 w-3.5" />
          Provider · New imaging request
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          Request an imaging procedure
        </h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Order studies like X-ray, CT, ultrasound, or MRI for one of your
          patients. The imaging team will receive the request with your
          clinical notes and priority level.
        </p>
      </header>

      <section className="relative grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.25fr)]">
        {/* Main form card */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {/* Accent bar */}
          <div className="-mx-6 -mt-6 mb-4 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-t-2xl" />

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Patient */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-800">
                Patient
              </label>
              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                Required
              </span>
            </div>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-800">
                Procedure code
              </label>
              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                Required
              </span>
            </div>
            <input
              type="text"
              value={procedureCode}
              onChange={(e) => setProcedureCode(e.target.value)}
              placeholder="e.g. CHEST_XRAY, ABDOMINAL_US"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Must match an existing imaging procedure in the catalogue{" "}
              <span className="font-mono text-[11px]">
                (ImagingProcedure.code)
              </span>
              .
            </p>
          </div>

          {/* Priority */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Priority
            </label>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    priority === opt.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 mr-1.5" />
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Use <span className="font-semibold">STAT</span> only for
              time-critical, emergent cases.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Clinical note (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Brief clinical history, question to be answered, or any special instructions for imaging."
            />
            <p className="mt-1 text-xs text-slate-500">
              Clear clinical questions often lead to better reports.
            </p>
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
              disabled={!canSubmit}
              className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? "Creating…" : "Create imaging request"}
            </button>
          </div>
        </form>

        {/* Side helper card */}
        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
              <ClipboardList className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Imaging request tips
              </p>
              <p className="text-xs text-slate-600">
                Help radiology understand what you&apos;re looking for.
              </p>
            </div>
          </div>

          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span>
                Use the exact procedure code from your imaging catalogue
                (e.g. <span className="font-mono">CHEST_XRAY</span>).
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span>
                Include recent symptoms, relevant lab results, or prior
                imaging in the clinical note where helpful.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span>
                Reserve <span className="font-semibold">STAT</span> for
                cases where turnaround time will change immediate management.
              </span>
            </li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
