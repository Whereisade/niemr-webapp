"use client";

import { useEffect, useState } from "react";
import { fetchDocumentsForPatient } from "@/lib/patientDocuments";
import { FileText, Loader2, Search, X } from "lucide-react";

// Function to display PDFs and images
function getFilePreviewUrl(fileUrl) {
  if (!fileUrl) return null;

  if (fileUrl.toLowerCase().endsWith(".pdf")) {
    return (
      <iframe
        src={fileUrl}
        width="100%"
        height="260"
        frameBorder="0"
        title="Document Preview"
      />
    );
  } else if (fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
    return (
      <img
        src={fileUrl}
        alt="Document preview"
        className="h-64 w-full object-contain"
      />
    );
  }
  return (
    <div className="flex h-24 items-center justify-center text-xs text-slate-500">
      No inline preview available
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

  // Filter documents by title or document type
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
  const distinctTypes = Array.from(
    new Set(
      documents
        .map((d) => d.document_type)
        .filter(Boolean)
        .map((t) => t.replace(/_/g, " "))
    )
  );

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
      {/* Subtle gradient background flair */}
      <div className="pointer-events-none absolute inset-x-0 -top-16 h-32 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-emerald-500/10 blur-3xl" />

      {/* Top gradient strip */}
      <div className="relative h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

      <div className="relative space-y-4 p-4 sm:p-5">
        {/* Header + quick stats */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
              <FileText className="h-3.5 w-3.5" />
              Patient documents
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              Files &amp; attachments
            </h2>
            <p className="max-w-xl text-xs text-slate-500 sm:text-sm">
              Browse all documents linked to this patient: IDs, scans, consents,
              clinical notes, and more. Use the search to quickly narrow
              results.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-right text-[11px] text-slate-500 sm:text-xs">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
              <div className="font-medium text-slate-500">Total files</div>
              <div className="mt-0.5 text-base font-semibold text-slate-900">
                {loading ? "…" : totalDocs}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
              <div className="font-medium text-slate-500">Visible</div>
              <div className="mt-0.5 text-base font-semibold text-slate-900">
                {loading ? "…" : visibleDocs}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
              <div className="font-medium text-slate-500">Doc types</div>
              <div className="mt-0.5 truncate text-base font-semibold text-slate-900">
                {loading ? "…" : distinctTypes.length || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Filter + chips */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search with icon + clear */}
          <div className="w-full max-w-md">
            <label
              className="mb-1 block text-[11px] font-medium text-slate-600"
              htmlFor="patient-documents-filter"
            >
              Filter documents
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-sm text-slate-900 shadow-sm">
              <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <input
                id="patient-documents-filter"
                type="text"
                placeholder="Type to filter by title or document type…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-7 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              {filter && (
                <button
                  type="button"
                  onClick={() => setFilter("")}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                  aria-label="Clear filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {visibleDocs}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">
                {totalDocs}
              </span>{" "}
              document{totalDocs === 1 ? "" : "s"}.
            </p>
          </div>

          {/* Type chips */}
          {distinctTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-start sm:justify-end">
              {distinctTypes.slice(0, 4).map((typeLabel) => {
                const isActive =
                  filter &&
                  filter.toLowerCase() === typeLabel.toLowerCase();
                return (
                  <button
                    key={typeLabel}
                    type="button"
                    onClick={() =>
                      setFilter(
                        isActive ? "" : typeLabel.toLowerCase()
                      )
                    }
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                      isActive
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/60"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {typeLabel}
                  </button>
                );
              })}
              {distinctTypes.length > 4 && (
                <span className="text-[11px] text-slate-500">
                  +{distinctTypes.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Error / loading / empty states / table */}
        {loading ? (
          <div className="mt-2 flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            <span>Loading documents&hellip;</span>
          </div>
        ) : error ? (
          <div className="mt-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : visibleDocs === 0 ? (
          <div className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
            {filter ? (
              <>
                No documents match{" "}
                <span className="font-medium">“{filter}”</span>. Try adjusting
                your search or clearing the filter.
              </>
            ) : (
              <>No documents uploaded by this patient yet.</>
            )}
          </div>
        ) : (
          <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.2fr)]">
            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
              <table className="min-w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left text-[0.7rem] font-semibold uppercase tracking-wide">
                      Type
                    </th>
                    <th className="px-3 py-2 text-left text-[0.7rem] font-semibold uppercase tracking-wide">
                      Title &amp; notes
                    </th>
                    <th className="px-3 py-2 text-left text-[0.7rem] font-semibold uppercase tracking-wide">
                      Uploaded
                    </th>
                    <th className="px-3 py-2 text-left text-[0.7rem] font-semibold uppercase tracking-wide">
                      Uploaded by
                    </th>
                    <th className="px-3 py-2 text-right text-[0.7rem] font-semibold uppercase tracking-wide" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredDocuments.map((doc) => {
                    const typeLabel =
                      doc.document_type?.replace(/_/g, " ") || "Unknown";
                    return (
                      <tr
                        key={doc.id}
                        className="align-top transition hover:bg-slate-50/70"
                      >
                        {/* Type */}
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-slate-700">
                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                            {typeLabel}
                          </span>
                        </td>

                        {/* Title + notes */}
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1">
                            <a
                              href={doc.file}
                              target="_blank"
                              rel="noreferrer"
                              className="max-w-xs truncate text-sm font-medium text-blue-600 hover:underline"
                            >
                              {doc.title || "View document"}
                            </a>
                            {doc.notes && (
                              <span className="max-w-md text-[0.7rem] text-slate-500 line-clamp-2">
                                {doc.notes}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Uploaded date */}
                        <td className="px-3 py-3 align-middle">
                          <span className="whitespace-nowrap text-[0.75rem] text-slate-500">
                            {formatDate(doc.created_at)}
                          </span>
                        </td>

                        {/* Uploaded by */}
                        <td className="px-3 py-3 align-middle">
                          <span className="text-[0.75rem] text-slate-500">
                            {doc.uploaded_by_name ||
                              doc.uploaded_by_role ||
                              "Unknown"}
                          </span>
                        </td>

                        {/* Open link */}
                        <td className="px-3 py-3 align-middle text-right">
                          <a
                            href={doc.file}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-[0.7rem] font-medium text-blue-700 shadow-sm transition hover:bg-blue-100"
                          >
                            Open
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Live preview panel */}
            <div className="hidden flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 sm:flex">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    Quick preview
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Select a document row and open it in a new tab, or view a
                    quick inline preview below.
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-3 py-1.5 text-[11px] text-slate-500 shadow-sm">
                  Inline preview is read-only
                </div>
              </div>

              {/* Show preview for first visible document as a simple, passive preview.
                  This does NOT change any logic or actions; it's purely visual. */}
              {filteredDocuments.length > 0 ? (
                <div className="mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {getFilePreviewUrl(filteredDocuments[0].file)}
                </div>
              ) : (
                <div className="mt-1 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-xs text-slate-400">
                  No document selected.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}


