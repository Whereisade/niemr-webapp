"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useImagingRequests } from "@/lib/useImagingRequests";
import { downloadImagingPdf } from "@/lib/reports";
import ImagingRequestDetailsModal from "@/components/imaging/ImagingRequestDetailsModal";
import { updateImagingRequestStatus } from "@/lib/imagingStatusActions";
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

export default function FacilityImagingRequestsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [downloadingId, setDownloadingId] = useState(null);

  // Modal state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRequestId, setDetailsRequestId] = useState(null);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attachmentsRequestId, setAttachmentsRequestId] = useState(null);

  const page = Number(sp.get("page") || 1);
  const limit = Number(sp.get("limit") || 20);
  const status = sp.get("status") || "";
  const patient = sp.get("patient") || "";
  const s = sp.get("s") || "";

  // Backend scopes requests by user.facility_id for staff roles
  const { data, error, isLoading } = useImagingRequests({
    page,
    limit,
    status,
    patient,
    s,
  });

  // Normalize rows
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
  const total = Number(data?.count ?? rows.length);

  const updateQuery = (patch) => {
    const params = new URLSearchParams(sp?.toString() || "");
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") {
        params.delete(k);
      } else {
        params.set(k, String(v));
      }
    });
    if ("status" in patch || "patient" in patch || "s" in patch || "limit" in patch) {
      params.set("page", "1");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  async function handleStatusChange(requestId, nextStatus) {
    if (!requestId || !nextStatus) return;

    if (nextStatus === "CANCELLED") {
      const ok = window.confirm(
        "Are you sure you want to cancel this imaging request?"
      );
      if (!ok) return;
    }

    try {
      await updateImagingRequestStatus(requestId, nextStatus);
      // simplest: refresh list from server
      router.refresh();
    } catch (err) {
      console.error("Failed to update imaging request status", err);
      alert(
        err?.message ||
          "Failed to update imaging request status. Please try again."
      );
    }
  }

  async function handleDownload(req) {
    if (!req?.id) return;
    try {
      setDownloadingId(req.id);
      await downloadImagingPdf(req.id);
    } catch (err) {
      console.error("Download imaging report failed", err);
      alert(err?.message || "Failed to download imaging report.");
    } finally {
      setDownloadingId(null);
    }
  }

  if (isLoading && !data) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          Facility Imaging Requests
        </h1>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
          Loading imaging requests…
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          Facility Imaging Requests
        </h1>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Failed to load: {error.message || "Unknown error"}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      {/* Header */}
      <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
            Imaging requests
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            View and manage imaging requests for this facility.
          </p>
        </div>

        <Link
          href="/facility/imaging/new"
          className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          New imaging request
        </Link>
      </header>

      {/* Filters + table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Filters */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Filters
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Search reason / notes…"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 md:w-56"
                defaultValue={s}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateQuery({ s: e.currentTarget.value });
                  }
                }}
              />
              <input
                type="text"
                placeholder="Filter by patient id…"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 md:w-40"
                defaultValue={patient}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateQuery({ patient: e.currentTarget.value });
                  }
                }}
              />
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 md:w-40"
                value={status}
                onChange={(e) => updateQuery({ status: e.target.value })}
              >
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 md:w-32"
                value={String(limit)}
                onChange={(e) => updateQuery({ limit: e.target.value })}
              >
                <option value="10">Show 10</option>
                <option value="20">Show 20</option>
                <option value="50">Show 50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                  Requested at
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                  Patient
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                  Procedure(s)
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                  Priority
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                  Status
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">
                  Report
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="p-3 text-sm text-slate-800">
                    {formatDateTime(req.requested_at || req.created_at)}
                  </td>
                  <td className="p-3 text-sm text-slate-800">
                    {req.patient_name || req.patient || "—"}
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
                      : req.procedures_display || req.procedure_name || "—"}
                  </td>
                  <td className="p-3 text-sm text-slate-800">
                    {req.priority || "—"}
                  </td>
                  <td className="p-3 text-sm text-slate-800">
                    {req.status || "—"}
                  </td>
                  <td className="p-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => handleDownload(req)}
                      disabled={downloadingId === req.id}
                      className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {downloadingId === req.id ? "Downloading…" : "PDF"}
                    </button>
                  </td>
                  <td className="p-3 text-right text-sm">
                    <div className="flex flex-wrap justify-end gap-2">
                      {req.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(req.id, "SCHEDULED")
                            }
                            className="rounded-full border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Mark scheduled
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(req.id, "CANCELLED")
                            }
                            className="rounded-full border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {req.status === "SCHEDULED" && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(req.id, "REPORTED")
                            }
                            className="rounded-full border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            Mark reported
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(req.id, "CANCELLED")
                            }
                            className="rounded-full border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setDetailsRequestId(req.id);
                          setDetailsOpen(true);
                        }}
                        className="rounded-full border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentsRequestId(req.id);
                          setAttachmentsOpen(true);
                        }}
                        className="rounded-full border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Attachments
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!rows.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-4 text-center text-sm text-slate-500"
                  >
                    No imaging requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pager */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
          <span>
            Page {page} · Showing {rows.length} of {total} item
            {total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => updateQuery({ page: Math.max(page - 1, 1) })}
              disabled={page <= 1}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => updateQuery({ page: page + 1 })}
              disabled={rows.length < limit}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
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
        canUpload={true}
      />
    </main>
  );
}
