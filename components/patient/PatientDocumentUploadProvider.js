"use client";

import { useState } from "react";
import { uploadPatientDocument } from "@/lib/patientDocuments";
import { FileText, Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";

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
        patientId,
      });

      setSuccess("Document uploaded successfully.");
      setFile(null);
      setTitle("");
      setNotes("");
      
      // Reset file input
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
      
      onUploadSuccess && onUploadSuccess(documentData);
    } catch (err) {
      console.error("Upload failed", err);
      setError("Failed to upload the document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Document Type */}
          <div>
            <label htmlFor="documentType" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-600">
              Type
            </label>
            <select
              id="documentType"
              name="documentType"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
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
            <label htmlFor="title" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-600">
              Title (optional)
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Full blood count"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-600">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any context..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* File upload */}
        <div>
          <label htmlFor="file-upload" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-600">
            File
          </label>
          <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/80 p-3 transition hover:border-blue-400 hover:bg-blue-50/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600/10">
                <Upload className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-900">
                  {file ? file.name : "Choose a file"}
                </div>
                <div className="text-[10px] text-slate-500">
                  {file ? `${Math.round(file.size / 1024)} KB` : "PDF, JPG, PNG, GIF"}
                </div>
              </div>
            </div>
            
            <input
              type="file"
              id="file-upload"
              name="file"
              accept="application/pdf, image/*"
              onChange={handleFileChange}
              className="mt-2 block w-full text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white file:hover:bg-blue-700"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Upload
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PatientDocumentUploadProvider;