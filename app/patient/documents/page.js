// app/patient/documents/page.js
"use client";

import { useEffect, useState } from "react";
import {
  fetchMyDocuments,
  uploadPatientDocument,
  deletePatientDocument,
} from "@/lib/patientDocuments";

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

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
          My documents
        </h1>
        <p className="text-sm text-slate-600">
          Upload lab results, imaging reports, or other medical documents so
          clinicians can see a complete picture of your health.
        </p>
      </header>

      {/* Alerts */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Upload form */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Upload a document
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          You can upload PDFs, images, or other document files. Each file will
          be tied to your patient record.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Document type
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Any context for your doctor (e.g. where the test was done)…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              File (PDF, image, or document)
            </label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif,.doc,.docx,image/*,application/pdf"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-700"
            />
            {file && (
              <p className="mt-1 text-xs text-slate-500">
                Selected: {file.name}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Upload document"}
            </button>
          </div>
        </form>
      </section>

      {/* Documents list */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Uploaded documents
          </h2>
          {!loading && documents.length > 0 && (
            <p className="text-xs text-slate-500">
              {documents.length} document
              {documents.length === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {loading ? (
          <p className="py-4 text-sm text-slate-500">
            Loading documents…
          </p>
        ) : documents.length === 0 ? (
          <p className="py-4 text-sm text-slate-500">
            You haven&apos;t uploaded any documents yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Type
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Title
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
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 align-middle">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-700">
                        {doc.document_type
                          ? doc.document_type.replace(/_/g, " ")
                          : "Unknown"}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="flex flex-col">
                        <a
                          href={doc.file || doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          {doc.title || "View document"}
                        </a>
                        {doc.notes && (
                          <span className="text-xs text-slate-500 line-clamp-2">
                            {doc.notes}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span className="text-xs text-slate-500">
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
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
