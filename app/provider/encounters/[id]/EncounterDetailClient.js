// app/provider/encounters/[id]/EncounterDetailClient.js
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { downloadEncounterPdf } from "@/lib/reports";

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

export default function EncounterDetailClient({ encounter, encounterId }) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);

  const patientName =
    encounter.patient_name ||
    [encounter.patient_first_name, encounter.patient_last_name]
      .filter(Boolean)
      .join(" ") ||
    encounter.patient ||
    "Patient";

  const providerName =
    encounter.provider_name ||
    [encounter.provider_first_name, encounter.provider_last_name]
      .filter(Boolean)
      .join(" ") ||
    encounter.provider ||
    "—";

  const facilityName =
    encounter.facility_name || encounter.facility || encounter.facility_id || "—";

  const type = encounter.encounter_type || encounter.type || "—";
  const status = encounter.status || "—";

  const chiefComplaint =
    encounter.chief_complaint || encounter.complaint || "";
  const history = encounter.history || encounter.hpi || "";
  const exam = encounter.exam || encounter.physical_exam || "";
  const assessment = encounter.assessment || "";
  const plan = encounter.plan || "";

  async function handleDownloadPdf() {
    if (!encounterId) return;
    try {
      setDownloading(true);
      await downloadEncounterPdf(encounterId);
    } catch (err) {
      console.error("Download encounter PDF failed", err);
      alert(
        err?.message ||
          "Failed to download encounter report. Please try again."
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-6 md:p-10 space-y-6">
      {/* Top bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Encounter for {patientName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {type !== "—" ? `${type} · ` : ""}
            {status}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {downloading ? "Generating PDF…" : "Download PDF"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/provider/encounters")}
            className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            Back to encounters
          </button>
        </div>
      </div>

      {/* Meta card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
        <dl className="grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Patient
            </dt>
            <dd className="mt-1 text-sm text-slate-900">{patientName}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Provider
            </dt>
            <dd className="mt-1 text-sm text-slate-900">{providerName}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Facility
            </dt>
            <dd className="mt-1 text-sm text-slate-900">{facilityName}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </dt>
            <dd className="mt-1 text-sm text-slate-900">{status}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Started at
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {formatDateTime(encounter.start_at || encounter.started_at)}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ended at
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {formatDateTime(encounter.end_at || encounter.ended_at)}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Encounter ID
            </dt>
            <dd className="mt-1 text-sm text-slate-900">{encounterId}</dd>
          </div>
        </dl>
      </section>

      {/* Clinical sections */}
      <section className="space-y-4">
        {chiefComplaint && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Chief complaint
            </h2>
            <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">
              {chiefComplaint}
            </p>
          </div>
        )}

        {history && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              History / HPI
            </h2>
            <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">
              {history}
            </p>
          </div>
        )}

        {exam && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Examination
            </h2>
            <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">
              {exam}
            </p>
          </div>
        )}

        {(assessment || plan) && (
          <div className="grid gap-4 md:grid-cols-2">
            {assessment && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">
                  Assessment
                </h2>
                <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">
                  {assessment}
                </p>
              </div>
            )}

            {plan && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Plan</h2>
                <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">
                  {plan}
                </p>
              </div>
            )}
          </div>
        )}

        {!chiefComplaint && !history && !exam && !assessment && !plan && (
          <p className="text-sm text-slate-500">
            No detailed notes have been recorded for this encounter yet.
          </p>
        )}
      </section>

      {/* Placeholder links to related data (future slices) */}
      <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">
          Related data (coming soon)
        </h2>
        <p className="text-xs text-slate-600">
          In future slices, this section can link to vitals, labs, imaging,
          prescriptions and attachments associated with this encounter.
        </p>
      </section>
    </main>
  );
}
