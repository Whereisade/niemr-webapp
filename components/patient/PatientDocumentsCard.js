// components/patient/PatientDocumentsCard.js
"use client";

import { useEffect, useState } from "react";
import { fetchDocumentsForPatient } from "@/lib/patientDocuments";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function PatientDocumentsCard({ patientId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patientId) return;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const list = await fetchDocumentsForPatient(patientId);
        setDocuments(list);
      } catch (err) {
        console.error("Failed to load patient documents", err);
        setError("Unable to load documents for this patient.");
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId]);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Patient documents</h2>
          <p className="text-xs text-gray-500">
            Files the patient has uploaded (lab results, imaging, reports). Visible
            to all clinicians who can access this record.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="py-3 text-sm text-gray-500">Loading documents…</p>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : documents.length === 0 ? (
        <p className="py-3 text-sm text-gray-500">
          No documents uploaded by this patient yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-[0.7rem] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700">
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
                  className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                >
                  <td className="px-3 py-2 align-middle">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-gray-700 dark:bg-gray-800 dark:text-gray-200">
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
                        <span className="text-[0.7rem] text-gray-500 line-clamp-2">
                          {doc.notes}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <span className="text-[0.7rem] text-gray-500">
                      {formatDate(doc.created_at)}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <span className="text-[0.7rem] text-gray-500">
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
