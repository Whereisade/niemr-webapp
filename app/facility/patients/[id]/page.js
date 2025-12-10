"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import PatientDocumentsProvider from "@/components/patient/PatientDocumentsProvider"; // Document provider component
import PatientDocumentUploadProvider from "@/components/patient/PatientDocumentUploadProvider"; // Upload component
import NurseWorkflow from "@/components/nurse/NurseWorkflow";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function FacilityPatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params?.id;

  const [patient, setPatient] = useState(null);
  const [patientError, setPatientError] = useState("");
  const [loadingPatient, setLoadingPatient] = useState(true);

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
    // Optimistic update: prepend new document to the list
    setPatient((prev) => ({
      ...prev,
      documents: [documentData, ...(prev?.documents || [])],
    }));
  };

  return (
    <main className="relative mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      {/* Back Link */}
      <button
        type="button"
        onClick={() => router.push("/facility/patients")}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
      >
        ← Back to patients
      </button>

      {/* Header */}
      <header className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            Patient record
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            {loadingPatient ? "Loading…" : displayName || "Patient"}
          </h1>
        </div>
      </header>

      {/* Patient Overview */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Patient Overview
        </h2>

        {loadingPatient ? (
          <p>Loading patient details...</p>
        ) : patientError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {patientError}
          </div>
        ) : patient ? (
          <div className="space-y-3">
            <p>
              <strong>Name:</strong> {displayName || "N/A"}
            </p>
            <p>
              <strong>Date of Birth:</strong> {formatDate(patient.date_of_birth)}
            </p>
            <p>
              <strong>Gender:</strong> {patient.gender || "N/A"}
            </p>
            <p>
              <strong>Email:</strong> {patient.email || "N/A"}
            </p>
            <p>
              <strong>Phone:</strong> {patient.phone || "N/A"}
            </p>
          </div>
        ) : (
          <p>Patient not found</p>
        )}
      </section>

      {/* Documents Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500">
          Documents
        </h2>
        <PatientDocumentsProvider patientId={patientId} />
      </section>

      {/* Document Upload Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500">
          Upload New Document
        </h2>
        <PatientDocumentUploadProvider
          patientId={patientId}
          onUploadSuccess={handleUploadSuccess}
        />
      </section>

      <NurseWorkflow patientId={patientId} />
    </main>
  );
}
