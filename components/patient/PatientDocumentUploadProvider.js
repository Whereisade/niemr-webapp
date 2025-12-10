// components/patient/PatientDocumentUploadProvider.js
"use client";

import { useState } from "react";
import { uploadPatientDocument } from "@/lib/patientDocuments"; // Reuse the helper

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

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const documentData = await uploadPatientDocument({
        file,
        title,
        documentType,
        notes,
      });

      setSuccess("Document uploaded successfully.");
      setFile(null);
      setTitle("");
      setNotes("");
      onUploadSuccess && onUploadSuccess(documentData); // callback to update the document list

    } catch (err) {
      console.error("Upload failed", err);
      setError("Failed to upload the document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Upload Document for Patient
      </h2>

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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Document Type */}
        <div>
          <label htmlFor="documentType" className="block text-sm font-medium">
            Document Type
          </label>
          <select
            id="documentType"
            name="documentType"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="LAB_RESULT">Lab Result</option>
            <option value="XRAY">X-ray</option>
            <option value="ULTRASOUND">Ultrasound</option>
            <option value="BLOOD_TEST">Blood Test</option>
            <option value="CT_SCAN">CT Scan</option>
            <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Document Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium">
            Document Title (Optional)
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows="3"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* File Upload */}
        <div>
          <label htmlFor="file" className="block text-sm font-medium">
            Upload File
          </label>
          <input
            type="file"
            id="file"
            name="file"
            accept="application/pdf, image/*"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-500"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Uploading…" : "Upload Document"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default PatientDocumentUploadProvider;
