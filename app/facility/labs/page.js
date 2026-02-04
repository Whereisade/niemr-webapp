"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useLabOrders } from "@/lib/useLabOrders";
import { downloadLabPdf } from "@/lib/reports";
import {
  markLabOrderCollected,
  cancelLabOrder,
} from "@/lib/labsStatusActions";
import LabOrderDetailsModal from "@/components/labs/LabOrderDetailsModal";
import LabOrderAttachmentsModal from "@/components/labs/LabOrderAttachmentsModal";
import {
  Activity,
  CalendarRange,
  Search,
  Filter,
  FileText,
  DownloadCloud,
  UserRound,
  Clock,
  ArrowLeft,
  ArrowRight,
  Building2,
  Award,     // Gold tier
  Star,      // Silver tier
  TrendingUp, // Bronze tier
} from "lucide-react";

// 🔹 role-based UI config
import {
  FACILITY_WORKSPACE_TYPES,
  getFacilityWorkspaceConfig,
} from "@/lib/roleUiConfig";

// 🔹 unified lab status UI helper
import { getLabStatusMeta } from "@/lib/LabsUiConfig";

// 🔹 HMO status color helper
import { getHMOStatusColors, getTierColors } from "@/lib/hmoStatusColors";


export default function FacilityLabOrdersPage(props) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <FacilityLabOrdersPageInner {...props} />
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

const normalizeStatus = (s) => String(s || "").toUpperCase();

/**
 * Helper function to extract HMO information from lab order data
 * Supports both new SystemHMO structure and legacy HMO structure
 */
function getLabOrderHMOInfo(order) {
  if (!order) {
    return {
      hasHMO: false,
      hmoName: null,
      tierName: null,
      tierLevel: null,
      relationshipStatus: null,
    };
  }

  // New SystemHMO structure - check for computed fields first
  if (order.patient_system_hmo_name || order.patient_hmo_tier_name) {
    return {
      hasHMO: true,
      hmoName: order.patient_system_hmo_name,
      tierName: order.patient_hmo_tier_name,
      tierLevel: order.patient_hmo_tier_level,
      relationshipStatus: order.patient_hmo_relationship_status,
    };
  }

  // Legacy HMO structure (backward compatibility)
  if (order.patient_hmo_name) {
    return {
      hasHMO: true,
      hmoName: order.patient_hmo_name,
      tierName: null,
      tierLevel: null,
      relationshipStatus: order.patient_hmo_relationship_status,
    };
  }

  // No HMO
  return {
    hasHMO: false,
    hmoName: null,
    tierName: null,
    tierLevel: null,
    relationshipStatus: null,
  };
}

/**
 * HMO Badge Component - displays HMO name with relationship status colors and tier
 */
function HMOBadge({ hmoName, relationshipStatus, tierName, tierLevel }) {
  if (!hmoName) {
    return <span className="text-xs text-slate-500">Self Pay</span>;
  }

  const hmoColors = getHMOStatusColors(relationshipStatus);
  const tierColors = tierLevel ? getTierColors(
    tierLevel === 1 ? 'GOLD' : tierLevel === 2 ? 'SILVER' : 'BRONZE'
  ) : null;

  return (
    <div className="flex flex-col gap-1">
      {/* HMO Name with relationship status colors */}
      <div className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${hmoColors.bgColor} ${hmoColors.textColor} ring-1 ${hmoColors.ringColor}`}>
        <Building2 className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">
          {hmoName}
        </span>
      </div>

      {/* Tier Badge (if available) */}
      {tierName && tierColors && (
        <div className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[11px] font-medium ${tierColors.bgColor} ${tierColors.textColor} ring-1 ${tierColors.ringColor}`}>
          {tierLevel === 1 && <Award className="h-3 w-3" />}
          {tierLevel === 2 && <Star className="h-3 w-3" />}
          {tierLevel === 3 && <TrendingUp className="h-3 w-3" />}
          <span>{tierName}</span>
        </div>
      )}
    </div>
  );
}

function FacilityLabOrdersPageInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(sp.get("page") || 1);
  const limit = Number(sp.get("limit") || 20);
  const status = sp.get("status") || "";
  const patient = sp.get("patient") || "";
  const s = sp.get("s") || "";

  const [refreshKey, setRefreshKey] = useState(0);

  // Backend scopes by user.facility_id for staff roles
  const { data, error, isLoading } = useLabOrders({
    page,
    limit,
    status,
    patient,
    s,
    refreshKey,
  });

  const [downloadingId, setDownloadingId] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsOrderId, setDetailsOrderId] = useState(null);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attachmentsOrderId, setAttachmentsOrderId] = useState(null);

  // 🔹 current user (for role-based UI)
  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        const res = await fetch("/api/proxy/accounts/me/", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });
        if (!res.ok) {
          throw new Error("Failed to load current user");
        }
        const json = await res.json();
        if (!cancelled) {
          setMe(json);
        }
      } catch (err) {
        console.error("Failed to fetch /accounts/me/ in labs page:", err);
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

  const meRole = (me?.role || "").toUpperCase();
  const canCollect =
    meRole === "LAB" || meRole === "ADMIN" || meRole === "SUPER_ADMIN";
  const canCancel =
    meRole === "DOCTOR" ||
    meRole === "NURSE" ||
    meRole === "ADMIN" ||
    meRole === "SUPER_ADMIN";

  const reload = () => setRefreshKey((k) => k + 1);

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

  // 🔹 Use real backend statuses
  const pendingCount = rows.filter(
    (o) => normalizeStatus(o.status) === "PENDING"
  ).length;
  const collectedCount = rows.filter(
    (o) => normalizeStatus(o.status) === "IN_PROGRESS"
  ).length; // "Sample collected / in progress"
  const reportedCount = rows.filter(
    (o) => normalizeStatus(o.status) === "COMPLETED"
  ).length; // "Reported"

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

  async function handleDownload(order) {
    if (!order?.id) return;
    try {
      setDownloadingId(order.id);
      await downloadLabPdf(order.id);
    } catch (err) {
      console.error("Download lab report failed", err);
      alert(err?.message || "Failed to download lab report.");
    } finally {
      setDownloadingId(null);
    }
  }

  if (isLoading && !data) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          Facility Lab Orders
        </h1>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-1.5 w-full -mt-6 mb-4 rounded-t-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
          <p className="text-sm text-slate-500">Loading lab orders…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          Facility Lab Orders
        </h1>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error.message}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Facility Lab Orders
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Lab test orders from providers in your facility
          </p>
        </div>
      </div>

      {/* Filters panel */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            Filter lab orders
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-64">
              <input
                type="search"
                placeholder="Search patient, test…"
                defaultValue={s}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateQuery({ s: e.currentTarget.value });
                  }
                }}
                onBlur={(e) => updateQuery({ s: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-44"
              value={status}
              onChange={(e) => updateQuery({ status: e.target.value })}
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-32"
              value={String(limit)}
              onChange={(e) => updateQuery({ limit: e.target.value })}
            >
              <option value="10">Show 10</option>
              <option value="20">Show 20</option>
              <option value="50">Show 50</option>
            </select>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 md:grid-cols-3">
        <StatTile
          label="Pending"
          value={pendingCount}
          accent="from-amber-500 to-orange-500"
        />
        <StatTile
          label="In Progress"
          value={collectedCount}
          accent="from-sky-500 to-blue-500"
        />
        <StatTile
          label="Completed"
          value={reportedCount}
          accent="from-emerald-500 to-teal-500"
        />
      </section>

      {/* Table card */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
              <Activity className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Lab orders in this facility
              </h2>
              <p className="text-xs text-slate-500">
                {total} order{total === 1 ? "" : "s"} found
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <Th>Patient</Th>
                <Th className="hidden md:table-cell">Insurance / HMO</Th>
                <Th className="hidden md:table-cell">Tests</Th>
                <Th>Status</Th>
                <Th className="hidden md:table-cell">Ordered</Th>
                <Th className="hidden md:table-cell text-right">Report</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.length ? (
                rows.map((order) => {
                  const statusCode = normalizeStatus(order.status);
                  
                  // Extract HMO information from order
                  const hmoInfo = getLabOrderHMOInfo(order);
                  
                  return (
                    <tr
                      key={order.id}
                      className="transition hover:bg-slate-50/60"
                    >
                      <Td>
                        <div className="flex items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600/10">
                            <UserRound className="h-4 w-4 text-blue-700" />
                          </span>
                          <span className="font-medium text-slate-900">
                            {order.patient_name || order.patient || "—"}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-slate-600 md:hidden">
                          <div className="flex items-center gap-1.5">
                            <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
                            <span>
                              {formatDateTime(
                                order.ordered_at || order.created_at
                              )}
                            </span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <FileText className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
                            <span className="line-clamp-2">
                              {Array.isArray(order.items)
                                ? order.items
                                    .map(
                                      (i) =>
                                        i.test?.name ||
                                        i.test?.code ||
                                        i.test_name ||
                                        i.code
                                    )
                                    .join(", ")
                                : order.tests_display || "â€”"}
                            </span>
                          </div>
                          <div>
                            <HMOBadge
                              hmoName={hmoInfo.hmoName}
                              relationshipStatus={hmoInfo.relationshipStatus}
                              tierName={hmoInfo.tierName}
                              tierLevel={hmoInfo.tierLevel}
                            />
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => handleDownload(order)}
                              disabled={downloadingId === order.id}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <DownloadCloud className="h-3.5 w-3.5" />
                              {downloadingId === order.id
                                ? "Generatingâ€¦"
                                : "PDF"}
                            </button>
                          </div>
                        </div>
                      </Td>

                      {/* UPDATED: HMO Column with new system support */}
                      <Td className="hidden md:table-cell">
                        <HMOBadge
                          hmoName={hmoInfo.hmoName}
                          relationshipStatus={hmoInfo.relationshipStatus}
                          tierName={hmoInfo.tierName}
                          tierLevel={hmoInfo.tierLevel}
                        />
                      </Td>

                      <Td className="hidden md:table-cell">
                        <div className="max-w-xs truncate text-slate-800">
                          {Array.isArray(order.items)
                            ? order.items
                                .map(
                                  (i) =>
                                    i.test?.name ||
                                    i.test?.code ||
                                    i.test_name ||
                                    i.code
                                )
                                .join(", ")
                            : order.tests_display || "—"}
                        </div>
                      </Td>

                      <Td>
                        {(() => {
                          const { label, badgeClass } = getLabStatusMeta(
                            order.status
                          );
                          return (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}
                            >
                              {label}
                            </span>
                          );
                        })()}
                      </Td>

                      <Td className="hidden md:table-cell">
                        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {formatDateTime(
                            order.ordered_at || order.created_at
                          )}
                        </div>
                      </Td>

                      <Td className="hidden md:table-cell text-right">
                        <button
                          type="button"
                          onClick={() => handleDownload(order)}
                          disabled={downloadingId === order.id}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <DownloadCloud className="h-3.5 w-3.5" />
                          {downloadingId === order.id ? "Generating…" : "PDF"}
                        </button>
                      </Td>

                      <Td>
                        <div className="flex flex-wrap gap-2">
                          {/* Always allow details + attachments */}
                          <Link
                            href={`/facility/labs/${order.id}`}
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            View
                          </Link>

                          {/* 🔹 Lab workflow actions */}
                          {statusCode === "PENDING" && canCollect && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await markLabOrderCollected(order.id);
                                  reload();
                                } catch (err) {
                                  console.error(
                                    "Failed to mark lab order collected",
                                    err
                                  );
                                  alert(
                                    err?.message ||
                                      "Failed to mark sample collected."
                                  );
                                }
                              }}
                              className="text-xs text-sky-700 hover:underline"
                            >
                              Mark sample collected
                            </button>
                          )}

                          {statusCode === "PENDING" && canCancel && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    "Cancel this lab order? This cannot be undone."
                                  )
                                ) {
                                  return;
                                }
                                try {
                                  await cancelLabOrder(order.id);
                                  reload();
                                } catch (err) {
                                  console.error(
                                    "Failed to cancel lab order",
                                    err
                                  );
                                  alert(
                                    err?.message ||
                                      "Failed to cancel lab order. Please try again."
                                  );
                                }
                              }}
                              className="text-xs text-rose-700 hover:underline"
                            >
                              Cancel order
                            </button>
                          )}

                          {statusCode === "IN_PROGRESS" && canCollect && (
                            <Link
                              href={`/facility/labs/${order.id}`}
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                            >
                              Enter result
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setDetailsOrderId(order.id);
                              setDetailsOpen(true);
                            }}
                            className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            View details
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAttachmentsOrderId(order.id);
                              setAttachmentsOpen(true);
                            }}
                            className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Attachments
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm">
                    <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
                      <Activity className="h-6 w-6 text-slate-400" />
                    </div>
                    <div className="text-sm font-medium text-slate-900">
                      No lab orders found
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      New orders created by providers in this facility will
                      appear here automatically.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pager */}
        <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div>
            Page {page} · {total} total
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => updateQuery({ page: page - 1 })}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 shadow-sm hover:border-slate-300 disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              disabled={rows.length < limit}
              onClick={() => updateQuery({ page: page + 1 })}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 shadow-sm hover:border-slate-300 disabled:opacity-50"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Details modal */}
      <LabOrderDetailsModal
        orderId={detailsOrderId}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />

      {/* Attachments modal */}
      <LabOrderAttachmentsModal
        orderId={attachmentsOrderId}
        open={attachmentsOpen}
        onClose={() => setAttachmentsOpen(false)}
        canUpload={true}
      />
    </main>
  );
}

/* ─────────────── UI helpers ─────────────── */

function StatTile({ label, value, accent }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
      <div className="p-5">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="mt-2 text-2xl font-semibold text-slate-900">
          {value}
        </div>
      </div>
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return (
    <td
      className={`px-4 py-3 align-middle text-sm text-slate-800 ${className}`}
    >
      {children}
    </td>
  );
}
