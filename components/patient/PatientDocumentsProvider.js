"use client";

import { useEffect, useState } from "react";
import { fetchDocumentsForPatient } from "@/lib/patientDocuments";
import { FileText, Loader2, Search, X, ExternalLink } from "lucide-react";

function getFilePreviewUrl(fileUrl) {
  if (!fileUrl) return null;

  if (fileUrl.toLowerCase().endsWith(".pdf")) {
    return (
      <iframe
        src={fileUrl}
        width="100%"
        height="200"
        frameBorder="0"
        title="Document Preview"
        className="rounded-lg"
      />
    );
  } else if (fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
    return (
      <img
        src={fileUrl}
        alt="Document preview"
        className="h-48 w-full rounded-lg object-contain"
      />
    );
  }
  return (
    <div className="flex h-20 items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-500">
      No preview available
    </div>
  );
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function PatientDocumentsProvider({ patientId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [filteredDocuments, setFilteredDocuments] = useState([]);

  useEffect(() => {
    if (!patientId) return;

    async function loadDocuments() {
      try {
        setLoading(true);
        setError("");
        const docs = await fetchDocumentsForPatient(patientId);
        setDocuments(docs);
      } catch (err) {
        console.error("Failed to load documents for patient", err);
        setError("Unable to load documents for this patient.");
      } finally {
        setLoading(false);
      }
    }

    loadDocuments();
  }, [patientId]);

  useEffect(() => {
    if (!filter.trim()) {
      setFilteredDocuments(documents);
    } else {
      const lowerCaseFilter = filter.toLowerCase();
      const filtered = documents.filter((doc) => {
        return (
          doc.title?.toLowerCase().includes(lowerCaseFilter) ||
          doc.document_type?.toLowerCase().includes(lowerCaseFilter)
        );
      });
      setFilteredDocuments(filtered);
    }
  }, [filter, documents]);

  const totalDocs = documents.length;
  const visibleDocs = filteredDocuments.length;

  return (
    <div className="space-y-3">
      {/* Search and Stats */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-sm">
          <Search className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400"
          />
          {filter && (
            <button
              type="button"
              onClick={() => setFilter("")}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-500 transition hover:bg-slate-300"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="font-semibold text-slate-900">{visibleDocs}</span>
          of
          <span className="font-semibold text-slate-900">{totalDocs}</span>
          {totalDocs === 1 ? "document" : "documents"}
        </div>
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          <span>Loading documents...</span>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : visibleDocs === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-500">
          {filter ? (
            <>
              No documents match <span className="font-medium">"{filter}"</span>
            </>
          ) : (
            "No documents uploaded yet."
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocuments.map((doc) => {
            const typeLabel = doc.document_type?.replace(/_/g, " ") || "Unknown";
            
            return (
              <div
                key={doc.id}
                className="group rounded-lg border border-slate-200 bg-white p-3 transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <a
                        href={doc.file}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-sm font-medium text-blue-600 hover:underline block"
                      >
                        {doc.title || "View document"}
                      </a>
                      
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium">
                          {typeLabel}
                        </span>
                        <span>•</span>
                        <span>{formatDate(doc.created_at)}</span>
                        {doc.uploaded_by_name && (
                          <>
                            <span>•</span>
                            <span>by {doc.uploaded_by_name}</span>
                          </>
                        )}
                      </div>

                      {doc.notes && (
                        <p className="mt-1.5 text-xs text-slate-600 line-clamp-2">
                          {doc.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <a
                    href={doc.file}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-medium text-blue-700 opacity-0 transition group-hover:opacity-100"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}