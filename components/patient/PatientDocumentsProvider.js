"use client";

import { useEffect, useState } from "react";
import { fetchDocumentsForPatient } from "@/lib/patientDocuments"; // Reuse the helper
import { FileText, Loader2 } from "lucide-react";

// Function to display PDFs and images
function getFilePreviewUrl(fileUrl) {
  if (fileUrl.endsWith(".pdf")) {
    return (
      <iframe
        src={fileUrl}
        width="100%"
        height="300px"
        frameBorder="0"
        title="Document Preview"
      />
    );
  } else if (fileUrl.match(/\.(jpeg|jpg|gif|png)$/)) {
    return <img src={fileUrl} alt="Document" width="100%" />;
  }
  return null;
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
  const [filter, setFilter] = useState(""); // Filter state
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
      const filtered = documents.filter((doc) => {
        const lowerCaseFilter = filter.toLowerCase();
        return (
          doc.title?.toLowerCase().includes(lowerCaseFilter) ||
          doc.document_type?.toLowerCase().includes(lowerCaseFilter)
        );
      });
      setFilteredDocuments(filtered);
    }
  }, [filter, documents]);

  return (
    <section className="relative rounded-xl border border-slate-300 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-gray-300">
          Patient Documents
        </h2>
        {/* Search Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search by title or document type"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <p className="text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> Loading
          documents…
        </p>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <p className="text-sm text-slate-500">
          No documents uploaded by this patient yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-gray-700 text-slate-500 dark:text-gray-300">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Uploaded</th>
                <th className="px-3 py-2">Uploaded by</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:bg-gray-800">
              {filteredDocuments.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b border-slate-100 last:border-0 dark:border-gray-700"
                >
                  <td className="px-3 py-2 align-middle">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-slate-700 dark:bg-gray-700 dark:text-gray-300">
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
                        className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {doc.title || "View document"}
                      </a>
                      {doc.notes && (
                        <span className="text-[0.7rem] text-slate-500 line-clamp-2 dark:text-gray-400">
                          {doc.notes}
                        </span>
                      )}
                    </div>
                    {/* Document Preview */}
                    <div className="mt-2">{getFilePreviewUrl(doc.file)}</div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <span className="text-[0.7rem] text-slate-500 dark:text-gray-400">
                      {formatDate(doc.created_at)}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <span className="text-[0.7rem] text-slate-500 dark:text-gray-400">
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
                      className="text-[0.7rem] font-medium text-blue-600 hover:underline dark:text-blue-400"
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
    </section>
  );
}
