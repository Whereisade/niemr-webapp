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
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
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
    (async () => {
      try {
        setLoading(true);
        const list = await fetchMyDocuments();
        setDocuments(list);
      } catch (err) {
        console.error(err);
        setError("Failed to load your documents.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
        title,
        notes,
      });

      // Prepend new document
      setDocuments((prev) => [created, ...prev]);

      // Reset form
      setFile(null);
      setTitle("");
      setNotes("");
      (e.target.reset && e.target.reset());

      setSuccess("Document uploaded successfully.");
    } catch (err) {
      console.error(err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this document?")) return;
    try {
      await deletePatientDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
      setError("Failed to delete document.");
    }
  }

  function handleFileChange(e) {
    const selected = e.target.files?.[0];
    setFile(selected || null);
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">My Documents</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Upload lab results, imaging reports, or other medical documents so any
          doctor or facility you see can access them from your record.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Upload form */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-3 text-lg font-medium">Upload a document</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Document type
              </label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
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
              <label className="mb-1 block text-sm font-medium">
                Optional title
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                placeholder="e.g. FBC result – Oct 2025"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Notes (optional)
            </label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
              placeholder="Any context for your doctor (e.g. where test was done)…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              File (PDF, image, or document)
            </label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif,.doc,.docx,image/*,application/pdf"
              onChange={handleFileChange}
              className="block w-full text-sm"
            />
            {file && (
              <p className="mt-1 text-xs text-gray-500">
                Selected: {file.name}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {uploading ? "Uploading…" : "Upload document"}
            </button>
          </div>
        </form>
      </section>

      {/* List */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Uploaded documents</h2>
        </div>

        {loading ? (
          <p className="py-4 text-sm text-gray-500">Loading documents…</p>
        ) : documents.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">
            You haven&apos;t uploaded any documents yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700">
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Uploaded</th>
                  <th className="px-3 py-2">By</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                  >
                    <td className="px-3 py-2 align-middle">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        {doc.document_type?.replace(/_/g, " ") || "Unknown"}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="flex flex-col">
                        <a
                          href={doc.file}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {doc.title || "View document"}
                        </a>
                        {doc.notes && (
                          <span className="text-xs text-gray-500 line-clamp-2">
                            {doc.notes}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span className="text-xs text-gray-500">
                        {formatDate(doc.created_at)}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span className="text-xs text-gray-500">
                        {doc.uploaded_by_role || "PATIENT"}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(doc.id)}
                        className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
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
    </div>
  );
}
