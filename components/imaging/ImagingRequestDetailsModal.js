// components/imaging/ImagingRequestDetailsModal.js
"use client";

import { useEffect, useState } from "react";
import { fetchImagingRequestById } from "@/lib/imagingDetails";

function formatDateTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

export default function ImagingRequestDetailsModal({ requestId, open, onClose }) {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !requestId) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetchImagingRequestById(requestId);
        if (cancelled) return;
        setRequest(res);
      } catch (err) {
        console.error("Failed to load imaging request details", err);
        if (!cancelled) {
          setError(
            err?.message ||
              "Failed to load imaging request details. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [open, requestId]);

  if (!open) return null;

  const proceduresDisplay = request
    ? Array.isArray(request.items)
      ? request.items
          .map(
            (i) =>
              i.procedure?.name ||
              i.procedure?.code ||
              i.procedure_name ||
              i.code
          )
          .join(", ")
      : request.procedures_display || request.procedure_name || "—"
    : "—";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40">
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Imaging request details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4 text-sm">
          {loading && (
            <p className="text-slate-500">Loading imaging request…</p>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {request && !loading && !error && (
            <>
              {/* Summary */}
              <div className="space-y-1">
                <div className="flex justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Patient
                  </span>
                  <span className="text-right text-sm text-slate-900">
                    {request.patient_name || request.patient || "—"}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </span>
                  <span className="text-right text-sm text-slate-900">
                    {request.status || "—"}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Priority
                  </span>
                  <span className="text-right text-sm text-slate-900">
                    {request.priority || "—"}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Requested at
                  </span>
                  <span className="text-right text-sm text-slate-900">
                    {formatDateTime(request.requested_at || request.created_at)}
                  </span>
                </div>
              </div>

              {/* Procedures */}
              <div className="space-y-1">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Procedure(s)
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                  {proceduresDisplay || "—"}
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Clinical note
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 whitespace-pre-wrap">
                  {request.note || "—"}
                </div>
              </div>

              {/* In future we can add: report text / attachments / findings fields here */}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
