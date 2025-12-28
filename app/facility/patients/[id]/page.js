"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import PatientDocumentsProvider from "@/components/patient/PatientDocumentsProvider";
import PatientDocumentUploadProvider from "@/components/patient/PatientDocumentUploadProvider";
import PatientVitalsHistory from "@/components/patient/PatientVitalsHistory";
import PatientAllergies from "@/components/patient/Patientallergies";
import NurseWorkflow from "@/components/nurse/NurseWorkflow";
import PatientEncounterListModal from "@/components/patient/PatientEncounterListModal";
import { Activity, FileText, Stethoscope, AlertTriangle } from "lucide-react";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function FacilityPatientDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openEncounters = searchParams.get('open_encounters');
  const params = useParams();
  const patientId = params?.id;

  const [patient, setPatient] = useState(null);
  const [patientError, setPatientError] = useState("");
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [encountersOpen, setEncountersOpen] = useState(false);

  useEffect(() => {
    if (openEncounters === '1') {
      setEncountersOpen(true);
    }
  }, [openEncounters]);

  useEffect(() => {
    if (!patientId) return;

    async function loadPatient() {
      try {
        setLoadingPatient(true);
        setPatientError("");
        const data = await apiFetch(`/patients/${patientId}/`);
        setPatient(data);
      } catch (err) {
        console.error("Failed to load patient", err);
        setPatientError("Unable to load patient details. Please try again.");
      } finally {
        setLoadingPatient(false);
      }
    }

    loadPatient();
  }, [patientId]);

  const fullName =
    patient?.first_name && patient?.last_name
      ? `${patient?.first_name} ${patient?.last_name}`
      : "—";

  const displayName =
    fullName || patient?.email || (patient ? `Patient #${patient.id}` : "");

  const handleUploadSuccess = (documentData) => {
    setPatient((prev) => ({
      ...prev,
      documents: [documentData, ...(prev?.documents || [])],
    }));
  };

  const genderLabel = patient?.gender || "N/A";

  return (
    <main className="min-h-screen bg-slate-50/80">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
        {/* Back Link */}
        <button
          type="button"
          onClick={() => router.push("/facility/patients")}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
        >
          <span className="text-sm">←</span>
          <span>Back to patients</span>
        </button>

        {/* Compact Header + overview card */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
          <div className="relative h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

          <div className="relative p-4 md:p-5">
            {/* Title row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-sm font-semibold text-blue-700">
                  {loadingPatient
                    ? "…"
                    : (displayName || "")
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 mb-1">
                    Patient record
                  </div>
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
                    {loadingPatient ? "Loading…" : displayName || "Patient"}
                  </h1>
                  {patient && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      ID: <span className="font-medium text-slate-800">{patient.id}</span>
                      {patient.mrn && <> • MRN: <span className="font-medium text-slate-800">{patient.mrn}</span></>}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/facility/vitals?patient=${patientId}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <Activity className="h-3.5 w-3.5" />
                  Vitals
                </Link>

                <button
                  type="button"
                  onClick={() => setEncountersOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <Stethoscope className="h-3.5 w-3.5" />
                  Encounters
                </button>
              </div>
            </div>

            {/* Error or skeleton or details */}
            {loadingPatient ? (
              <div className="mt-4 grid animate-pulse gap-2 grid-cols-2 md:grid-cols-4">
                <div className="h-14 rounded-xl bg-slate-100" />
                <div className="h-14 rounded-xl bg-slate-100" />
                <div className="h-14 rounded-xl bg-slate-100" />
                <div className="h-14 rounded-xl bg-slate-100" />
              </div>
            ) : patientError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {patientError}
              </div>
            ) : patient ? (
              <div className="mt-4 grid gap-2 grid-cols-2 md:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Date of birth
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDate(patient.dob)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Gender
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {genderLabel}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Email
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-slate-900">
                    {patient.email || "N/A"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Phone
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {patient.phone || "N/A"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Patient not found.
              </div>
            )}
          </div>
        </section>

        {/* Grid Layout for Sections */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Allergies - Compact */}
          <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
            <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />
            <div className="p-3 md:p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                    Allergies
                  </h2>
                </div>
              </div>
              <PatientAllergies patientId={patientId} />
            </div>
          </section>

          {/* Vitals History - Compact */}
          <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500" />
            <div className="p-3 md:p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
                  <Activity className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                    Vitals History
                  </h2>
                </div>
              </div>
              <PatientVitalsHistory patientId={patientId} />
            </div>
          </section>
        </div>

        {/* Nurse Workflow - Full Width but Compact */}
        <NurseWorkflow patientId={patientId} />

        {/* Documents Grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Documents viewing */}
          <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
            <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
            <div className="p-3 md:p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                    Documents
                  </h2>
                </div>
              </div>
              <PatientDocumentsProvider patientId={patientId} />
            </div>
          </section>

          {/* Upload new document */}
          <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
            <div className="h-1 bg-gradient-to-r from-indigo-500 via-blue-600 to-emerald-500" />
            <div className="p-3 md:p-4">
              <div className="mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                  Upload Document
                </h2>
              </div>
              <PatientDocumentUploadProvider
                patientId={patientId}
                onUploadSuccess={handleUploadSuccess}
              />
            </div>
          </section>
        </div>
      </div>

      <PatientEncounterListModal
        open={encountersOpen}
        onClose={() => setEncountersOpen(false)}
        patientId={patientId}
        patientName={displayName}
        scope="facility"
      />
    </main>
  );
}