"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import ImagingRequestDetailsModal from "@/components/imaging/ImagingRequestDetailsModal";
import ImagingAttachmentsModal from "@/components/imaging/ImagingAttachmentsModal";

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

// Base BFF path for imaging requests
const IMAGING_BASE = "/imaging/requests/";

export default function PatientImagingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRequestId, setDetailsRequestId] = useState(null);

  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attachmentsRequestId, setAttachmentsRequestId] = useState(null);

  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "10");

  useEffect(() => {
    let cancelled = false;

    async function fetchImaging() {
      try {
        setLoading(true);
        setError("");

        const qs = new URLSearchParams();
        qs.set("page", String(page));
        qs.set("limit", String(limit));

        // Backend should scope to current PATIENT for this role
        const res = await apiFetch(`${IMAGING_BASE}?${qs.toString()}`);
        if (cancelled) return;
        setData(res);
      } catch (err) {
        console.error("Failed to load patient imaging requests", err);
        if (!cancelled) {
          setError(
            err?.message ||
              "Failed to load imaging requests. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchImaging();
    return () => {
      cancelled = true;
    };
  }, [page, limit]);

  // Normalize list shape (handles array, {results}, or numeric-keyed object)
  let rows = [];
  if (Array.isArray(data?.results)) {
    rows = data.results;
  } else if (Array.isArray(data)) {
    rows = data;
  } else if (data && typeof data === "object") {
    const numericKeys = Object.keys(data).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) {
      rows = numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => data[k]);
    }
  }

  const hasNextPage = rows.length === limit;
  const hasPrevPage = page > 1;

  function goToPage(nextPage) {
    const sp = new URLSearchParams(searchParams.toString());
    if (nextPage && nextPage > 1) {
      sp.set("page", String(nextPage));
    } else {
      sp.delete("page");
    }
    router.push(`/patient/imaging?${sp.toString()}`);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <header className="mb-4">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
          My imaging requests
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          View imaging requests (X-ray, CT, MRI, ultrasound, etc.) that have
          been ordered for you and track their status.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Requested at
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Procedure(s)
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Priority
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-4 text-center text-sm text-slate-500"
                  >
                    Loading imaging requests…
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="p-3 text-sm text-slate-800">
                      {formatDateTime(req.requested_at || req.created_at)}
                    </td>
                    <td className="p-3 text-sm text-slate-800">
                      {Array.isArray(req.items)
                        ? req.items
                            .map(
                              (i) =>
                                i.procedure?.name ||
                                i.procedure?.code ||
                                i.procedure_name ||
                                i.code
                            )
                            .join(", ")
                        : req.procedures_display ||
                          req.procedure_name ||
                          "—"}
                    </td>
                    <td className="p-3 text-sm text-slate-800">
                      {req.priority || "—"}
                    </td>
                    <td className="p-3 text-sm text-slate-800">
                      {req.status || "—"}
                    </td>
                    <td className="p-3 text-right text-sm">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDetailsRequestId(req.id);
                            setDetailsOpen(true);
                          }}
                          className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachmentsRequestId(req.id);
                            setAttachmentsOpen(true);
                          }}
                          className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Attachments
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {!loading && !rows.length && !error && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-4 text-center text-sm text-slate-500"
                  >
                    You don&apos;t have any imaging requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pager */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
          <span>
            Page {page} · Showing {rows.length} item
            {rows.length === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={!hasPrevPage}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={!hasNextPage}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <ImagingRequestDetailsModal
        requestId={detailsRequestId}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />

      <ImagingAttachmentsModal
        requestId={attachmentsRequestId}
        open={attachmentsOpen}
        onClose={() => setAttachmentsOpen(false)}
        canUpload={false}
      />
    </main>
  );
}
