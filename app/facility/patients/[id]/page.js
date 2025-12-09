// app/facility/patients/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { fetchDocumentsForPatient } from "@/lib/patientDocuments";
import {
  ArrowLeft,
  Loader2,
  UserRound,
  Calendar,
  Mail,
  Phone,
  FileText,
} from "lucide-react";

function formatDate(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

export default function FacilityPatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params?.id;

  const [patient, setPatient] = useState(null);
  const [patientError, setPatientError] = useState("");
  const [loadingPatient, setLoadingPatient] = useState(true);

  const [documents, setDocuments] = useState([]);
  const [docsError, setDocsError] = useState("");
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    if (!patientId) return;

    let cancelled = false;

    async function loadPatient() {
      try {
        setLoadingPatient(true);
        setPatientError("");
        const data = await apiFetch(`/patients/${patientId}/`);
        if (cancelled) return;
        setPatient(data);
      } catch (err) {
        console.error("Failed to load patient", err);
        if (!cancelled) {
          setPatientError(
            err?.message || "Unable to load patient details. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoadingPatient(false);
      }
    }

    async function loadDocuments() {
      try {
        setLoadingDocs(true);
        setDocsError("");
        const docs = await fetchDocumentsForPatient(patientId);
        if (cancelled) return;
        setDocuments(docs);
      } catch (err) {
        console.error("Failed to load documents for patient", err);
        if (!cancelled) {
          setDocsError(
            err?.message || "Unable to load patient documents. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoadingDocs(false);
      }
    }

    loadPatient();
    loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const fullName = patient
    ? [patient.first_name, patient.last_name].filter(Boolean).join(" ")
    : "";

  const displayName =
    fullName || patient?.email || (patient ? `Patient #${patient.id}` : "");

  return (
    <main className="relative mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      {/* soft background accents */}
      <div className="pointer-events-none absolute -top-28 -left-32 h-52 w-52 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-32 h-56 w-56 rounded-full bg-emerald-100/50 blur-3xl" />

      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push("/facility/patients")}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to patients
      </button>

      {/* Header / patient summary */}
      <header className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <UserRound className="h-3.5 w-3.5" />
            Patient record
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            {loadingPatient ? "Loading…" : displayName || "Patient"}
          </h1>
          {patient && (
            <p className="mt-1 text-sm text-slate-600">
              {patient.mrn && (
                <span className="font-mono text-xs text-slate-500">
                  MRN: {patient.mrn}
                </span>
              )}
            </p>
          )}
        </div>
      </header>

      {/* Patient + documents */}
      <section className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Patient demographics card */}
        <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="-mx-5 -mt-5 mb-4 h-1.5 rounded-t-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Patient overview
          </h2>

          {loadingPatient ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              Loading patient details…
            </div>
          ) : patientError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {patientError}
            </div>
          ) : patient ? (
            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <dt className="text-slate-500">Full name</dt>
                <dd className="font-medium text-slate-900">
                  {displayName || "—"}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-2">
                <dt className="text-slate-500">Date of birth</dt>
                <dd className="flex items-center gap-1 text-slate-900">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {patient.date_of_birth
                    ? formatDate(patient.date_of_birth)
                    : "—"}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-2">
                <dt className="text-slate-500">Gender</dt>
                <dd className="text-slate-900">{patient.gender || "—"}</dd>
              </div>

              <div className="flex items-start justify-between gap-2">
                <dt className="text-slate-500">Email</dt>
                <dd className="flex items-center gap-1 text-slate-900">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {patient.email || "—"}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-2">
                <dt className="text-slate-500">Phone</dt>
                <dd className="flex items-center gap-1 text-slate-900">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {patient.phone || "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-500">
              Patient not found or you don&apos;t have access.
            </p>
          )}
        </div>

        {/* Documents card */}
        <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="-mx-5 -mt-5 mb-4 h-1.5 rounded-t-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />

          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Uploaded documents
            </h2>
          </div>

          {loadingDocs ? (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              Loading documents…
            </p>
          ) : docsError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {docsError}
            </div>
          ) : documents.length === 0 ? (
            <p className="text-sm text-slate-500">
              This patient hasn&apos;t uploaded any documents yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Uploaded</th>
                    <th className="px-3 py-2">Uploaded by</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-3 py-2 align-middle">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-slate-700">
                          <FileText className="h-3 w-3 text-slate-400" />
                          {doc.document_type?.replace(/_/g, " ") || "Unknown"}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="flex flex-col">
                          <a
                            href={doc.file}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-blue-600 hover:underline"
                          >
                            {doc.title || "View document"}
                          </a>
                          {doc.notes && (
                            <span className="text-[0.7rem] text-slate-500 line-clamp-2">
                              {doc.notes}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <span className="text-[0.7rem] text-slate-500">
                          {formatDate(doc.created_at)}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <span className="text-[0.7rem] text-slate-500">
                          {doc.uploaded_by_name ||
                            doc.uploaded_by_role ||
                            "Unknown"}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-middle text-right">
                        <a
                          href={doc.file}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[0.7rem] font-medium text-blue-600 hover:underline"
                        >
                          Open
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
