"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useImagingRequests } from "@/lib/useImagingRequests";
import { downloadImagingPdf } from "@/lib/reports";
import ImagingRequestDetailsModal from "@/components/imaging/ImagingRequestDetailsModal";
import { updateImagingRequestStatus } from "@/lib/imagingStatusActions";
import ImagingAttachmentsModal from "@/components/imaging/ImagingAttachmentsModal";
import {
  ScanLine,
  Search,
  Filter,
  FileText,
  Paperclip,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// 🔹 role-based UI config
import {
  FACILITY_WORKSPACE_TYPES,
  getFacilityWorkspaceConfig,
} from "@/lib/roleUiConfig";


export default function FacilityImagingRequestsPage(props) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <FacilityImagingRequestsPageInner {...props} />
    </Suspense>
  );
}

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

function FacilityImagingRequestsPageInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [downloadingId, setDownloadingId] = useState(null);

  // Modals
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

  // 🔹 current user (for role-based UI)
  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        const res = await fetch("/api/proxy/accounts/me/", {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          throw new Error("Failed to load current user");
        }
        const json = await res.json();
        if (!cancelled) {
          setMe(json);
        }
      } catch (err) {
        console.error("Failed to fetch /accounts/me/ in imaging page:", err);
        if (!cancelled) {
          setMe(null);
        }
      } finally {
        if (!cancelled) {
          setMeLoading(false);
        }
      }
    }

    loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const workspace = me ? getFacilityWorkspaceConfig(me.role) : null;
  const isOwner = workspace?.type === FACILITY_WORKSPACE_TYPES.OWNER;

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

  const stats = useMemo(() => {
    const pending = rows.filter(
      (r) => (r.status || "").toUpperCase() === "PENDING"
    ).length;
    const completed = rows.filter((r) =>
      ["COMPLETED", "REPORTED"].includes((r.status || "").toUpperCase())
    ).length;
    return { pending, completed };
  }, [rows]);

  const updateQuery = (patch) => {
    const params = new URLSearchParams(sp?.toString() || "");
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") {
        params.delete(k);
      } else {
        params.set(k, String(v));
      }
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
          Facility imaging requests
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
          Facility imaging requests
        </h1>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Failed to load: {error.message || "Unknown error"}
        </div>
      </main>
    );
  }

  return (
    <main className="relative mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      {/* Soft glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100/60 blur-3xl" />

      {/* Header */}
      <header className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <ScanLine className="h-3.5 w-3.5" />
            Facility · Imaging
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Imaging requests
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            View, track, and manage all imaging requests for this facility.
          </p>
        </div>

        <div className="space-x-2">
          {/* 🔐 Only facility OWNER/ADMIN should see this */}
          {isOwner && (
            <Link
              href="/facility/imaging/procedures"
              className="inline-flex items-center rounded-full bg-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              New imaging procedure
            </Link>
          )}

          {/* New imaging request is visible to all facility imaging-capable staff */}
          <Link
            href="/facility/imaging/new"
            className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            New imaging request
          </Link>
        </div>
      </header>

      {/* Stats row */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Requests on this page"
          value={rows.length}
          accent="from-blue-600 via-indigo-600 to-violet-600"
        />
        <StatTile
          label="Pending (page)"
          value={stats.pending}
          accent="from-amber-500 via-orange-500 to-red-500"
        />
        <StatTile
          label="Total (all pages)"
          value={total}
          accent="from-emerald-600 via-teal-600 to-cyan-600"
        />
      </section>

      {/* Error inline (if any) */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error.message || "Failed to load imaging requests."}
        </div>
      )}

      {/* Filters + table card */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

        {/* Filters */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              Filters
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative w-full md:w-56">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search indication / notes…"
                  className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  defaultValue={s}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      updateQuery({ s: e.currentTarget.value });
                    }
                  }}
                  onBlur={(e) => updateQuery({ s: e.currentTarget.value })}
                />
              </div>

              <input
                type="text"
                placeholder="Filter by patient ID…"
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
                const priority = req.priority || "—";
                const st = req.status || "—";

                return (
                  <tr
                    key={req.id}
                    className="transition hover:bg-slate-50/60"
                  >
                    <Td>
                      <span className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-700">
                        {requestedAt}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs font-medium text-slate-900">
                        {patientName}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs text-slate-700 line-clamp-2">
                        {procedures}
                      </span>
                    </Td>
                    <Td>
                      <PriorityPill value={priority} />
                    </Td>
                    <Td>
                      <StatusPill value={st} />
                    </Td>
                    <Td className="text-right">
                      <button
                        type="button"
                        onClick={() => handleDownload(req)}
                        disabled={downloadingId === req.id}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {downloadingId === req.id ? "Downloading…" : "PDF"}
                      </button>
                    </Td>
                    <Td className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {st === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(req.id, "SCHEDULED")
                              }
                              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Mark scheduled
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(req.id, "CANCELLED")
                              }
                              className="rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {st === "SCHEDULED" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(req.id, "IN_PROGRESS")
                              }
                              className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50"
                            >
                              Mark in progress
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(req.id, "CANCELLED")
                              }
                              className="rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {st === "IN_PROGRESS" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(req.id, "COMPLETED")
                            }
                            className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            Mark completed
                          </button>
                        )}

                        {(st === "COMPLETED" || st === "REPORTED") && (
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(req.id, "REPORTED")
                            }
                            className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            Mark reported
                          </button>
                        )}

                        {/* View now navigates to the facility imaging detail page */}
                        <Link
                          href={`/facility/imaging/${req.id}`}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setAttachmentsRequestId(req.id);
                            setAttachmentsOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
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
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
                      <ScanLine className="h-6 w-6 text-slate-400" />
                    </div>
                    <div className="text-sm font-medium text-slate-900">
                      No imaging requests found
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Adjust your filters or create a new imaging request.
                    </div>
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
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 font-medium hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => updateQuery({ page: page + 1 })}
              disabled={rows.length < limit}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 font-medium hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Details modal (still available if you keep using it elsewhere) */}
      <ImagingRequestDetailsModal
        requestId={detailsRequestId}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />

      {/* Attachments modal */}
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
      className={`px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return (
    <td className={`px-3 py-3 align-top text-xs text-slate-800 ${className}`}>
      {children}
    </td>
  );
}

function StatTile({ label, value, accent }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
      <div className="p-4">
        <div className="text-xs font-medium text-slate-600">{label}</div>
        <div className="mt-1 text-2xl font-semibold text-slate-900">
          {value}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ value }) {
  const v = String(value || "").toUpperCase();
  const map = {
    PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
    SCHEDULED: "bg-slate-50 text-slate-700 ring-slate-200",
    IN_PROGRESS: "bg-blue-50 text-blue-700 ring-blue-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    REPORTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  const cls = map[v] || "bg-slate-50 text-slate-700 ring-slate-200";
  const label = (v || "—").replaceAll("_", " ");
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-medium ring-1 ${cls}`}
    >
      {label}
    </span>
  );
}

function PriorityPill({ value }) {
  const v = String(value || "").toUpperCase();
  const map = {
    ROUTINE: "bg-slate-50 text-slate-700 ring-slate-200",
    URGENT: "bg-amber-50 text-amber-700 ring-amber-200",
    STAT: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  const cls = map[v] || "bg-slate-50 text-slate-700 ring-slate-200";
  const label = v || "—";
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-medium ring-1 ${cls}`}
    >
      {label}
    </span>
  );
}
