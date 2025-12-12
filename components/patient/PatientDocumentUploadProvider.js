"use client";

import { useState } from "react";
import { uploadPatientDocument } from "@/lib/patientDocuments";
import { FileText, Upload, Loader2, Info } from "lucide-react";

function PatientDocumentUploadProvider({ patientId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("LAB_RESULT");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    console.log("PatientDocumentUploadProvider - patientId prop:", patientId);

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const documentData = await uploadPatientDocument({
        file,
        title,
        documentType,
        notes,
        patientId, // keep passing patientId
      });

      setSuccess("Document uploaded successfully.");
      setFile(null);
      setTitle("");
      setNotes("");
      onUploadSuccess && onUploadSuccess(documentData);
    } catch (err) {
      console.error("Upload failed", err);
      setError("Failed to upload the document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
      {/* Soft gradient flair */}
      <div className="pointer-events-none absolute inset-x-0 -top-16 h-32 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-emerald-500/10 blur-3xl" />

      {/* Top strip */}
      <div className="relative h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

      <div className="relative space-y-4 p-4 sm:p-5">
        {/* Header row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
              <FileText className="h-3.5 w-3.5" />
              Upload document
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              Attach file to patient record
            </h2>
            <p className="max-w-xl text-xs text-slate-500 sm:text-sm">
              Upload lab results, imaging reports, consents, or any supporting
              file. Files are attached directly to this patient&apos;s record.
            </p>
          </div>

          {/* Patient badge + info */}
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {patientId && (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] text-slate-600">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600/10 text-[11px] font-semibold text-blue-700">
                  ID
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-slate-900">
                    Patient ID: {patientId}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Document will be linked to this patient.
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-1 rounded-2xl bg-slate-50/80 px-3 py-1.5 text-[10px] text-slate-500">
              <Info className="h-3 w-3 flex-shrink-0 text-slate-400" />
              <span>Accepted formats: PDF, JPG, PNG, GIF.</span>
            </div>
          </div>
        </div>

        {/* Alerts */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Upper grid: type + title */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Document Type */}
            <div>
              <label
                htmlFor="documentType"
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600"
              >
                Document type
              </label>
              <select
                id="documentType"
                name="documentType"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="LAB_RESULT">Lab Result</option>
                <option value="XRAY">X-ray</option>
                <option value="ULTRASOUND">Ultrasound</option>
                <option value="BLOOD_TEST">Blood Test</option>
                <option value="CT_SCAN">CT Scan</option>
                <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                <option value="OTHER">Other</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                Choose the category that best describes this file.
              </p>
            </div>

            {/* Document Title */}
            <div>
              <label
                htmlFor="title"
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600"
              >
                Document title (optional)
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Full blood count, Discharge summary, etc."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                A short label helps staff quickly recognize the file.
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600"
            >
              Notes (optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any context or clinical notes related to this document."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Notes are visible to facility staff when viewing the document.
            </p>
          </div>

          {/* File upload + summary */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)]">
            {/* File chooser */}
            <div>
              <label
                htmlFor="file"
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600"
              >
                Upload file
              </label>
              <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
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

                <div>
                  <input
                    type="file"
                    id="file"
                    name="file"
                    accept="application/pdf, image/*"
                    onChange={handleFileChange}
                    className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white file:hover:bg-blue-700"
                  />
                </div>

                {file ? (
                  <div className="mt-1 rounded-2xl bg-white/80 px-3 py-2 text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-900">
                      Selected:
                    </span>{" "}
                    {file.name}{" "}
                    <span className="text-slate-400">
                      ({Math.round(file.size / 1024)} KB)
                    </span>
                  </div>
                ) : (
                  <div className="mt-1 rounded-2xl bg-white/60 px-3 py-2 text-[11px] text-slate-500">
                    No file selected yet.
                  </div>
                )}
              </div>
            </div>

            {/* Side info card */}
            <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-[11px] text-slate-500">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                Upload guidelines
              </div>
              <ul className="space-y-1 list-disc pl-4">
                <li>Ensure patient identifiers are visible on clinical scans.</li>
                <li>Use PDF for multi-page reports or summaries.</li>
                <li>
                  For photos, aim for clear, readable images (no glare or blur).
                </li>
                <li>
                  Avoid uploading extremely large files unless clinically
                  necessary.
                </li>
              </ul>
              <div className="mt-2 rounded-2xl bg-white px-3 py-2 text-[10px] text-slate-500 shadow-sm">
                Uploaded documents become part of the patient&apos;s NIEMR
                timeline and can be viewed from the Documents panel.
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
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
  );
}

export default PatientDocumentUploadProvider;


