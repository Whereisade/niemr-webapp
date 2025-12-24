"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function ProviderPatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params?.id;

  const [patient, setPatient] = useState(null);
  const [patientError, setPatientError] = useState("");
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [encountersOpen, setEncountersOpen] = useState(false);
  const [me, setMe] = useState(null);
  const [startingEncounter, setStartingEncounter] = useState(false);
  const [startError, setStartError] = useState("");

  useEffect(() => {
    if (!patientId) return;

    async function loadMe() {
      try {
        const meData = await apiFetch("/accounts/me/");
        setMe(meData);
      } catch {
        // ignore
      }
    }

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

    loadMe();
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
  async function startEncounter() {
    setStartingEncounter(true);
    setStartError("");
    try {
      const enc = await apiFetch("/encounters/start-from-patient/", {
        method: "POST",
        body: JSON.stringify({ patient_id: patientId }),
      });

      const encId = enc?.id;
      if (encId) {
        const role = String(me?.role || "").toUpperCase();
        // Doctor starts at clinical note; Nurse starts at nurse workflow.
        if (role === "NURSE") {
          router.push(`/provider/encounters/${encId}/workflow/nurse`);
        } else {
          router.push(`/provider/encounters/${encId}/workflow/clinical`);
        }
        return;
      }
      router.push("/provider/encounters");
    } catch (err) {
      console.error("Start encounter failed", err);
      setStartError(err?.message || "Failed to start encounter.");
    } finally {
      setStartingEncounter(false);
    }
  }


  const genderLabel = patient?.gender || "N/A";

  return (
    <main className="min-h-screen bg-slate-50/80">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
        {startError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {startError}
          </div>
        ) : null}
        {/* Back Link */}
        <button
          type="button"
          onClick={() => router.push("/provider/patients")}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
        >
          <span className="text-sm">←</span>
          <span>Back to patients</span>
        </button>

        {/* Header + overview card */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
          {/* Soft gradient flair */}
          <div className="pointer-events-none absolute inset-x-0 -top-16 h-32 bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-emerald-500/15 blur-3xl" />
          {/* Top strip */}
          <div className="relative h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

          <div className="relative flex flex-col gap-6 p-5 md:p-6 lg:p-7">
            {/* Title row */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  Patient record
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600/10 text-sm font-semibold text-blue-700">
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
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                      {loadingPatient ? "Loading…" : displayName || "Patient"}
                    </h1>
                    {patient && (
                      <p className="mt-0.5 text-xs text-slate-500 md:text-sm">
                        Patient ID:{" "}
                        <span className="font-medium text-slate-800">
                          {patient.id}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                <Link
                  href={`/facility/vitals?patient=${patientId}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <Activity className="h-4 w-4" />
                  View all vitals
                </Link>

                {(me?.role === "DOCTOR" || me?.role === "NURSE") ? (
                  <button
                    type="button"
                    onClick={startEncounter}
                    disabled={startingEncounter}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                    title="Start a new encounter for this patient"
                  >
                    <Stethoscope className="h-4 w-4" />
                    {startingEncounter ? "Starting…" : "Start Encounter"}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setEncountersOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                  title="View this patient's encounters"
                >
                  <Stethoscope className="h-4 w-4" />
                  Encounters
                </button>
              </div>
            </div>

            {/* Error or skeleton or details */}
            {loadingPatient ? (
              <div className="grid animate-pulse gap-3 md:grid-cols-4">
                <div className="h-16 rounded-2xl bg-slate-100" />
                <div className="h-16 rounded-2xl bg-slate-100" />
                <div className="h-16 rounded-2xl bg-slate-100" />
                <div className="h-16 rounded-2xl bg-slate-100" />
              </div>
            ) : patientError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {patientError}
              </div>
            ) : patient ? (
              <>
                {/* Overview stats */}
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-xs text-slate-600">
                    <div className="text-[11px] font-medium text-slate-500">
                      Date of birth
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDate(patient.dob)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-xs text-slate-600">
                    <div className="text-[11px] font-medium text-slate-500">
                      Gender
                    </div>
                    <div className="mt-1 inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-800">
                      {genderLabel}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-xs text-slate-600">
                    <div className="text-[11px] font-medium text-slate-500">
                      Email
                    </div>
                    <div className="mt-1 max-w-xs truncate text-sm font-semibold text-slate-900">
                      {patient.email || "N/A"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-xs text-slate-600">
                    <div className="text-[11px] font-medium text-slate-500">
                      Phone
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {patient.phone || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Basic details list */}
                <div className="mt-3 grid gap-4 text-xs text-slate-600 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <div>
                      <span className="font-medium text-slate-500">
                        Name:
                      </span>{" "}
                      <span className="font-semibold text-slate-900">
                        {displayName || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-500">
                        Contact:
                      </span>{" "}
                      <span>
                        {patient.phone || "N/A"}{" "}
                        {patient.email && (
                          <span className="text-slate-400">•</span>
                        )}{" "}
                        {patient.email}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <span className="font-medium text-slate-500">
                        Record status:
                      </span>{" "}
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Active
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Any vitals, documents, and nurse actions below will be
                      associated with this patient&apos;s NIEMR record.
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Patient not found.
              </div>
            )}
          </div>
        </section>

        {/* Allergies (stacked) */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />
          <div className="relative p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                    Allergies
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Known allergies and adverse reactions.
                  </p>
                </div>
              </div>
            </div>
            <PatientAllergies patientId={patientId} />
          </div>
        </section>

        {/* Vitals History (stacked) */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500" />
          <div className="relative p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
                  <Stethoscope className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                    Vitals history
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Bedside measurements recorded for this patient.
                  </p>
                </div>
              </div>
            </div>
            <PatientVitalsHistory patientId={patientId} />
          </div>
        </section>

        {/* Nurse Workflow (stacked) */}
        {me?.role === "NURSE" ? <NurseWorkflow patientId={patientId} /> : null}

        {/* Documents viewing (stacked) */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
          <div className="relative p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                    Documents
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    All files attached to this patient&apos;s record.
                  </p>
                </div>
              </div>
            </div>
            <PatientDocumentsProvider patientId={patientId} />
          </div>
        </section>

        {/* Upload new document (stacked) */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-600 to-emerald-500" />
          <div className="relative p-4 md:p-5">
            <div className="mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                Upload new document
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Attach lab results, scanned reports, or consents to this
                record.
              </p>
            </div>
            <PatientDocumentUploadProvider
              patientId={patientId}
              onUploadSuccess={handleUploadSuccess}
            />
          </div>
        </section>
      </div>

      <PatientEncounterListModal
        open={encountersOpen}
        onClose={() => setEncountersOpen(false)}
        patientId={patientId}
        patientName={displayName}
        scope="provider"
      />
    </main>
  );
}