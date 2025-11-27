"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useLabOrders } from "@/lib/useLabOrders";
import { downloadLabPdf } from "@/lib/reports";
import LabOrderDetailsModal from "@/components/labs/LabOrderDetailsModal";
import LabOrderAttachmentsModal from "@/components/labs/LabOrderAttachmentsModal";
import {
  FlaskConical,
  Filter,
  UsersRound,
  Activity,
  ClipboardList,
  Hourglass,
  ArrowLeft,
  ArrowRight,
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

export default function ProviderLabOrdersPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(sp.get("page") || 1);
  const limit = Number(sp.get("limit") || 20);
  const status = sp.get("status") || "";
  const patient = sp.get("patient") || "";
  const s = sp.get("s") || "";

  // Backend scopes by facility / role in LabOrderViewSet.get_queryset()
  const { data, error, isLoading } = useLabOrders({
    page,
    limit,
    status,
    patient,
    s,
  });

  const [downloadingId, setDownloadingId] = useState(null);

  // modal state for lab order details
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsOrderId, setDetailsOrderId] = useState(null);

  // NEW: attachments modal state
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attachmentsOrderId, setAttachmentsOrderId] = useState(null);

  // 🔧 Normalize data into a proper rows array (handles BFF numeric-key object)
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
    if ("status" in patch || "patient" in patch || "s" in patch) {
      params.set("page", "1");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  async function handleDownload(order) {
    if (!order?.id) {
      alert("Missing lab id for report.");
      return;
    }
    try {
      setDownloadingId(order.id);
      await downloadLabPdf(order.id);
    } catch (err) {
      console.error("Download lab report failed", err);
      alert(
        err?.message || "Failed to download lab report. Please try again."
      );
    } finally {
      setDownloadingId(null);
    }
  }

  if (isLoading && !data) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="mb-4 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          Lab Orders
        </h1>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="-mt-6 mb-4 h-1.5 w-full rounded-t-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
          <p className="text-slate-500">Loading lab orders…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="mb-4 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          Lab Orders
        </h1>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Failed to load: {error.message || "Unknown error"}
        </div>
      </main>
    );
  }

  // Quick stats
  const uniquePatients = new Set(
    rows.map((r) => r.patient_name || r.patient)
  ).size;
  const pendingOnPage = rows.filter(
    (r) => String(r.status || "").toUpperCase() === "PENDING"
  ).length;

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      {/* Header + top actions */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <FlaskConical className="h-3.5 w-3.5" />
            Provider Lab Orders
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Lab orders for patients in my care
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Filter by patient, status, or search text and track order progress.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* New order button */}
          <Link
            href="/provider/labs/new"
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            New lab order
          </Link>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative">
          <input
            type="search"
            placeholder="Search tests / notes…"
            defaultValue={s}
            onBlur={(e) => updateQuery({ s: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-56"
          />
          <Activity className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Filter by patient ID…"
            defaultValue={patient}
            onBlur={(e) => updateQuery({ patient: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-56"
          />
          <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
        <select
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-40"
          value={status}
          onChange={(e) => updateQuery({ status: e.target.value })}
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="COLLECTED">Collected</option>
          <option value="REPORTED">Reported</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Quick stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={UsersRound}
          label="Patients in results"
          value={uniquePatients || 0}
          accent="from-blue-600 via-indigo-600 to-violet-600"
        />
        <StatTile
          icon={ClipboardList}
          label="Orders on page"
          value={rows.length}
          accent="from-emerald-600 via-teal-600 to-cyan-600"
        />
        <StatTile
          icon={Hourglass}
          label="Pending on page"
          value={pendingOnPage}
          accent="from-amber-600 via-orange-600 to-red-600"
        />
        <StatTile
          icon={Activity}
          label="Total (all pages)"
          value={total}
          accent="from-fuchsia-600 via-pink-600 to-rose-600"
        />
      </section>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <Th>Patient</Th>
              <Th>Tests</Th>
              <Th>Status</Th>
              <Th>Ordered At</Th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                Result
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((order) => (
              <tr key={order.id} className="transition hover:bg-slate-50/60">
                <Td>
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600/10">
                      <UsersRound className="h-4 w-4 text-blue-700" />
                    </span>
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {order.patient_name || order.patient || "—"}
                      </div>
                      {order.encounter_id && (
                        <div className="text-xs text-slate-500">
                          Encounter #{order.encounter_id}
                        </div>
                      )}
                    </div>
                  </div>
                </Td>
                <Td>
                  {Array.isArray(order.items) && order.items.length ? (
                    <div className="flex flex-wrap gap-1">
                      {order.items.slice(0, 4).map((i, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                        >
                          {i.test?.name ||
                            i.test?.code ||
                            i.test_name ||
                            i.code ||
                            "Test"}
                        </span>
                      ))}
                      {order.items.length > 4 && (
                        <span className="text-xs text-slate-500">
                          +{order.items.length - 4} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-500">
                      {order.tests_display || "—"}
                    </span>
                  )}
                </Td>
                <Td>
                  <StatusPill value={order.status} />
                </Td>
                <Td>
                  <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                    {formatDateTime(order.ordered_at || order.created_at)}
                  </span>
                </Td>
                <td className="p-3 text-right text-sm">
                  <div className="inline-flex flex-wrap items-center gap-2">
                    {/* View button → opens details modal */}
                    <button
                      type="button"
                      onClick={() => {
                        setDetailsOrderId(order.id);
                        setDetailsOpen(true);
                      }}
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      View
                    </button>

                    {/* NEW: Attachments button → opens attachments modal */}
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentsOrderId(order.id);
                        setAttachmentsOpen(true);
                      }}
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Attachments
                    </button>

                    {/* PDF button */}
                    <button
                      type="button"
                      onClick={() => handleDownload(order)}
                      disabled={downloadingId === order.id}
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {downloadingId === order.id ? "Generating…" : "PDF"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!rows.length && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
                    <FlaskConical className="h-6 w-6 text-slate-400" />
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    No lab orders found
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    New lab orders will appear here automatically.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pager */}
      <div className="flex items-center justify-between pt-2 text-sm text-slate-600">
        <div>
          Page {page} · {total} total
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => updateQuery({ page: page - 1 })}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 shadow-sm hover:border-slate-300 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            type="button"
            disabled={rows.length < limit}
            onClick={() => updateQuery({ page: page + 1 })}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 shadow-sm hover:border-slate-300 disabled:opacity-50"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Lab order details modal */}
      <LabOrderDetailsModal
        orderId={detailsOrderId}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />

      {/* NEW: Lab order attachments modal */}
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

function StatTile({ icon: Icon, label, value, accent }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">{label}</div>
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
            <Icon className="h-5 w-5 text-slate-700" />
          </div>
        </div>
        <div className="mt-2 text-3xl font-semibold text-slate-900">
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
    COLLECTED: "bg-blue-50 text-blue-700 ring-blue-200",
    REPORTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  const cls = map[v] || "bg-slate-50 text-slate-700 ring-slate-200";
  const label = (v || "—").replaceAll("_", " ");
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-1 text-xs ring-1 ${cls}`}
    >
      {label}
    </span>
  );
}

function Th({ children }) {
  return (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
      {children}
    </th>
  );
}

function Td({ children }) {
  return <td className="p-3 text-sm text-slate-800 align-top">{children}</td>;
}
