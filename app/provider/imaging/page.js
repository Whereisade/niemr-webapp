"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useImagingRequests } from "@/lib/useImagingRequests";
import { downloadImagingPdf } from "@/lib/reports";
import ImagingRequestDetailsModal from "@/components/imaging/ImagingRequestDetailsModal";
import { updateImagingRequestStatus } from "@/lib/imagingStatusActions";
import ImagingAttachmentsModal from "@/components/imaging/ImagingAttachmentsModal";
import {
  ScanLine,
  Filter,
  UsersRound,
  Activity,
  ClipboardList,
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
  Download,
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

  // Modals
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRequestId, setDetailsRequestId] = useState(null);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attachmentsRequestId, setAttachmentsRequestId] = useState(null);

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
    if ("status" in patch || "patient" in patch || "s" in patch || "limit" in patch) {
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
      router.refresh();
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
          Imaging requests
        </h1>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
          <div className="p-6 text-sm text-slate-500">
            Loading imaging requests…
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="mb-4 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          Imaging requests
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
    <main className="relative mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      {/* Soft background glows */}
      <div className="pointer-events-none absolute -top-20 -left-24 h-64 w-64 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100/60 blur-3xl" />

      {/* Header */}
      <header className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <ScanLine className="h-3.5 w-3.5" />
            Provider · Imaging
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Imaging requests for my patients
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review, filter, and manage imaging requests. Open a request to view
            clinical details, attachments, and download reports.
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
      <section className="relative grid gap-4 md:grid-cols-3">
        <StatCard
          icon={UsersRound}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="Unique patients"
          value={uniquePatients}
        />
        <StatCard
          icon={ClipboardList}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          label="Pending / scheduled"
          value={pendingOrScheduled}
        />
        <StatCard
          icon={Activity}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="Total requests"
          value={total}
        />
      </section>

      {/* Filters + table */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

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
                onBlur={(e) => updateQuery({ s: e.currentTarget.value })}
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
                onBlur={(e) => updateQuery({ patient: e.currentTarget.value })}
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
                <option value="REPORTED">Reported</option>
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
                <Th>Requested at</Th>
                <Th>Patient</Th>
                <Th>Procedure(s)</Th>
                <Th>Priority</Th>
                <Th>Status</Th>
                <Th className="text-right">Report</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((req) => {
                const statusValue = String(req.status || "").toUpperCase();
                const priorityValue = String(req.priority || "").toUpperCase();

                const requestedAt = formatDateTime(
                  req.requested_at || req.created_at
                );
                const patientName = req.patient_name || req.patient || "—";
                const procedures = Array.isArray(req.items)
                  ? req.items
                      .map(
                        (i) =>
                          i.procedure?.name ||
                          i.procedure?.code ||
                          i.procedure_name ||
                          i.code
                      )
                      .join(", ")
                  : req.procedures_display || req.procedure_name || "—";

                return (
                  <tr key={req.id} className="transition hover:bg-slate-50/60">
                    <Td>
                      <div className="flex items-center gap-1 text-xs text-slate-800">
                        <span>{requestedAt}</span>
                      </div>
                    </Td>
                    <Td>
                      <span className="text-sm text-slate-900">
                        {patientName}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-sm text-slate-800">
                        {procedures}
                      </span>
                    </Td>
                    <Td>
                      <PriorityPill value={priorityValue} />
                    </Td>
                    <Td>
                      <StatusPill value={statusValue} />
                    </Td>
                    <Td className="text-right">
                      <button
                        type="button"
                        onClick={() => handleDownload(req)}
                        disabled={downloadingId === req.id}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        {downloadingId === req.id ? "Downloading…" : "PDF"}
                      </button>
                    </Td>
                    <Td className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {statusValue === "PENDING" && (
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
                              className="rounded-full border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {statusValue === "SCHEDULED" && (
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
                              className="rounded-full border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
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

                        <button
                          type="button"
                          onClick={() => {
                            setAttachmentsRequestId(req.id);
                            setAttachmentsOpen(true);
                          }}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Attachments
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}

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

      {/* Modals */}
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

/* ─────────────── UI helpers ─────────────── */

function Th({ children, className = "" }) {
  return (
    <th
      className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return (
    <td className={`px-3 py-2 align-top text-sm text-slate-800 ${className}`}>
      {children}
    </td>
  );
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="text-lg font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function StatusPill({ value }) {
  const v = String(value || "").toUpperCase();
  const map = {
    PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
    SCHEDULED: "bg-sky-50 text-sky-700 ring-sky-200",
    IN_PROGRESS: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    REPORTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  const cls = map[v] || "bg-slate-50 text-slate-700 ring-slate-200";
  const label = (v || "—").replaceAll("_", " ");

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${cls}`}
    >
      {label}
    </span>
  );
}

function PriorityPill({ value }) {
  const v = String(value || "").toUpperCase();
  const map = {
    ROUTINE: "bg-slate-50 text-slate-700 ring-slate-200",
    URGENT: "bg-orange-50 text-orange-700 ring-orange-200",
    STAT: "bg-red-50 text-red-700 ring-red-200",
  };
  const cls = map[v] || "bg-slate-50 text-slate-700 ring-slate-200";
  const label = v || "—";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${cls}`}
    >
      {label}
    </span>
  );
}
