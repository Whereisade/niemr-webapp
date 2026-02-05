// app/patient/documents/page.js
"use client";

import { useEffect, useState } from "react";
import {
  fetchMyDocuments,
  uploadPatientDocument,
  deletePatientDocument,
} from "@/lib/patientDocuments";
import { FileText, Upload, Loader2, Trash2 } from "lucide-react";

const DOCUMENT_TYPES = [
  { value: "LAB_RESULT", label: "Lab result" },
  { value: "BLOOD_TEST", label: "Blood test" },
  { value: "XRAY", label: "X-ray" },
  { value: "ULTRASOUND", label: "Ultrasound" },
  { value: "CT_SCAN", label: "CT scan" },
  { value: "DISCHARGE_SUMMARY", label: "Discharge summary" },
  { value: "REFERRAL_NOTE", label: "Referral note" },
  { value: "OTHER", label: "Other" },
];

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

function normaliseDocuments(body) {
  if (!body) return [];

  if (Array.isArray(body?.results)) {
    return body.results;
  }
  if (Array.isArray(body)) {
    return body;
  }
  if (body && typeof body === "object") {
    const numericKeys = Object.keys(body).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => body[k]);
    }
  }
  return [];
}

export default function PatientDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("LAB_RESULT");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetchMyDocuments();
        if (cancelled) return;
        setDocuments(normaliseDocuments(res));
      } catch (err) {
        console.error("Failed to load patient documents", err);
        if (!cancelled) {
          setError(
            err?.message ||
              "Failed to load your documents. Please try again."
          );
          setDocuments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleFileChange(e) {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }

    try {
      setUploading(true);

      const created = await uploadPatientDocument({
        file,
        documentType,
        title: title.trim() || null,
        notes: notes.trim() || null,
      });

      // Prepend newly uploaded document
      setDocuments((prev) => [created, ...prev]);

      // Reset form state
      setFile(null);
      setTitle("");
      setNotes("");
      setDocumentType("LAB_RESULT");
      if (e.target && typeof e.target.reset === "function") {
        e.target.reset();
      }

      setSuccess("Document uploaded successfully.");
    } catch (err) {
      console.error("Upload patient document failed", err);
      const detail =
        err?.detail ||
        (err?.data && JSON.stringify(err.data)) ||
        err?.message;
      setError(
        detail || "Upload failed. Please check the file and try again."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!id) return;
    const ok = window.confirm("Delete this document?");
    if (!ok) return;

    try {
      await deletePatientDocument(id);
      setDocuments((prev) =>
        prev.filter(
          (d) => d.id !== id && String(d.id) !== String(id)
        )
      );
    } catch (err) {
      console.error("Failed to delete document", err);
      setError(
        err?.message || "Failed to delete document. Please try again."
      );
    }
  }

  const totalDocs = documents.length;

  return (
    <main className="min-h-screen bg-slate-50/80">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
        {/* Header / hero */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
          {/* Soft gradient flair */}
          <div className="pointer-events-none absolute inset-x-0 -top-16 h-32 bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-emerald-500/15 blur-3xl" />
          {/* Top strip */}
          <div className="relative h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

          <div className="relative flex flex-col gap-5 p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  <FileText className="h-3.5 w-3.5" />
                  Patient portal
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                    My documents
                  </h1>
                  <p className="mt-1 max-w-xl text-sm text-slate-600">
                    Upload lab results, imaging reports, and other medical
                    documents so your care team can see a complete picture of
                    your health.
                  </p>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-2 text-right text-[11px] text-slate-500 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                  <div className="font-medium text-slate-500">
                    Total files
                  </div>
                  <div className="mt-0.5 text-lg font-semibold text-slate-900">
                    {loading ? "…" : totalDocs}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                  <div className="font-medium text-slate-500">
                    Latest upload
                  </div>
                  <div className="mt-0.5 text-xs font-semibold text-slate-900">
                    {loading || !documents[0]
                      ? "—"
                      : formatDate(
                          documents[0].created_at ||
                            documents[0].uploaded_at ||
                            documents[0].timestamp
                        )}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                  <div className="font-medium text-slate-500">
                    Status
                  </div>
                  <div className="mt-0.5 inline-flex items-center justify-end gap-1 text-xs font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Active
                  </div>
                </div>
              </div>
            </div>

            {/* Alerts */}
            <div className="space-y-2">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Upload form */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
          {/* Top strip */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

          <div className="relative space-y-4 p-5 md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                  Upload a document
                </h2>
                <p className="mt-1 text-xs text-slate-600 md:text-sm">
                  You can upload PDFs, images, or other document files. Each
                  file will be tied to your NIEMR patient record.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50/80 px-3 py-2 text-[11px] text-slate-500">
                Accepted formats: PDF, images, and common document types. Keep
                files clear and readable.
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Document type
                  </label>
                  <select
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                  >
                    {DOCUMENT_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Title (optional)
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    placeholder="e.g. FBC result – Oct 2025"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Notes (optional)
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Any context for your doctor (e.g. where the test was done)…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  File (PDF, image, or document)
                </label>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/10">
                      <Upload className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">
                        Drop a file here or browse
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Maximum size depends on server configuration.
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif,.doc,.docx,image/*,application/pdf"
                      onChange={handleFileChange}
                      className="block w-full text-xs text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white file:hover:bg-blue-700"
                    />
                  </div>
                  {file && (
                    <p className="mt-2 rounded-2xl bg-white/80 px-3 py-2 text-xs text-slate-600">
                      <span className="font-semibold text-slate-900">
                        Selected:
                      </span>{" "}
                      {file.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload document
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Documents list */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
          {/* Top strip */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500" />

          <div className="relative p-5 md:p-6">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
                  <FileText className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                    Uploaded documents
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Files you&apos;ve shared with your care team.
                  </p>
                </div>
              </div>
              {!loading && documents.length > 0 && (
                <p className="text-xs text-slate-500">
                  {documents.length} document
                  {documents.length === 1 ? "" : "s"}
                </p>
              )}
            </div>

            {loading ? (
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                <span>Loading documents…</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
                You haven&apos;t uploaded any documents yet. Once you upload
                files, they&apos;ll appear here.
              </div>
            ) : (
              <>
                {/* Mobile / tablet cards */}
                <div className="space-y-3 md:hidden">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          {doc.document_type
                            ? doc.document_type.replace(/_/g, " ")
                            : "Unknown"}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {formatDate(
                            doc.created_at ||
                              doc.uploaded_at ||
                              doc.timestamp
                          )}
                        </span>
                      </div>

                      <div className="mt-2">
                        <a
                          href={doc.file || doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-sm font-medium text-blue-600 hover:underline"
                        >
                          {doc.title || "View document"}
                        </a>
                        {doc.notes && (
                          <p className="mt-1 text-xs text-slate-500">
                            {doc.notes}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {doc.uploaded_by_role ||
                            doc.uploaded_by ||
                            "PATIENT"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 shadow-sm transition hover:bg-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden overflow-x-auto rounded-2xl border border-slate-100 md:block">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Type
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Title &amp; notes
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Uploaded
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        By
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {documents.map((doc) => (
                      <tr
                        key={doc.id}
                        className="align-top transition hover:bg-slate-50/70"
                      >
                        <td className="px-3 py-2 align-middle">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            {doc.document_type
                              ? doc.document_type.replace(/_/g, " ")
                              : "Unknown"}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="flex flex-col gap-1">
                            <a
                              href={doc.file || doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="max-w-xs truncate text-sm font-medium text-blue-600 hover:underline"
                            >
                              {doc.title || "View document"}
                            </a>
                            {doc.notes && (
                              <span className="max-w-md text-xs text-slate-500 line-clamp-2">
                                {doc.notes}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <span className="whitespace-nowrap text-xs text-slate-500">
                            {formatDate(
                              doc.created_at ||
                                doc.uploaded_at ||
                                doc.timestamp
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <span className="text-xs text-slate-500">
                            {doc.uploaded_by_role ||
                              doc.uploaded_by ||
                              "PATIENT"}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-middle text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(doc.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 shadow-sm transition hover:bg-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
