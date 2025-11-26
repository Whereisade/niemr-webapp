"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useImagingRequests } from "@/lib/useImagingRequests";
import { downloadImagingPdf } from "@/lib/reports";
import ImagingRequestDetailsModal from "@/components/imaging/ImagingRequestDetailsModal";
import { updateImagingRequestStatus } from "@/lib/imagingStatusActions";
import {
  ScanLine,
  Filter,
  UsersRound,
  Activity,
  ClipboardList,
  Clock,
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
} from "lucide-react";

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

export default function ProviderImagingRequestsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(sp.get("page") || 1);
  const limit = Number(sp.get("limit") || 20);
  const status = sp.get("status") || "";
  const patient = sp.get("patient") || "";
  const s = sp.get("s") || "";

  const [downloadingId, setDownloadingId] = useState(null);

  // Modal state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRequestId, setDetailsRequestId] = useState(null);

  // Backend scopes by facility / role in ImagingRequestViewSet.get_queryset()
  const { data, error, isLoading } = useImagingRequests({
    page,
    limit,
    status,
    patient,
    s,
  });

  // Normalize rows (array, {results}, or numeric-keyed object)
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
      if (v === undefined || v === null || v === "") params.delete(k);
      else params.set(k, String(v));
    });
    if (
      "status" in patch ||
      "patient" in patch ||
      "s" in patch ||
      "limit" in patch
    ) {
      params.set("page", "1");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

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
      router.refresh(); // re-fetch data
    } catch (err) {
      console.error("Failed to update imaging request status", err);
      alert(
        err?.message ||
          "Failed to update imaging request status. Please try again."
      );
    }
  }

  if (isLoading && !data) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="mb-4 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          Imaging Requests
        </h1>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="-mt-6 mb-4 h-1.5 w-full rounded-t-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
          <p className="text-slate-500">Loading imaging requests…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="mb-4 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          Imaging Requests
        </h1>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Failed to load: {error.message || "Unknown error"}
        </div>
      </main>
    );
  }

  const uniquePatients = new Set(
    rows.map((r) => r.patient_name || r.patient)
  ).size;
  const pendingOrScheduled = rows.filter((r) => {
    const v = String(r.status || "").toUpperCase();
    return v === "PENDING" || v === "SCHEDULED";
  }).length;

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <ScanLine className="h-3.5 w-3.5" />
            Provider Imaging
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Imaging requests for patients in my care
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Filter by patient, status, or text search. Open a request to view
            full details and download reports.
          </p>
        </div>

        <Link
          href="/provider/imaging/new"
          className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          New imaging request
        </Link>
      </header>

      {/* Quick stats */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <UsersRound className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Unique patients
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {uniquePatients}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
            <ClipboardList className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Pending / Scheduled
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {pendingOrScheduled}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <Activity className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total requests
            </p>
            <p className="text-lg font-semibold text-slate-900">{total}</p>
          </div>
        </div>
      </section>

      {/* Filters + table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Filters */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Filter className="h-3.5 w-3.5" />
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
                      <FileDownloadIcon className="mr-1.5 h-3.5 w-3.5" />
                      {downloadingId === req.id ? "Downloading…" : "PDF"}
                    </button>
                  </td>
                  <td className="p-3 text-right text-sm">
                    <div className="flex flex-wrap justify-end gap-2">
                      {String(req.status || "").toUpperCase() ===
                        "PENDING" && (
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

                      {String(req.status || "").toUpperCase() ===
                        "SCHEDULED" && (
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
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        View
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
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => updateQuery({ page: page + 1 })}
              disabled={rows.length < limit}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Next
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Modal */}
      <ImagingRequestDetailsModal
        requestId={detailsRequestId}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />
    </main>
  );
}

// tiny icon helper so we don't pull in more from lucide
function FileDownloadIcon(props) {
  return <Clock {...props} />;
}
