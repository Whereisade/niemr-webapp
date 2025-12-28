"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { usePrescriptions } from "@/lib/usePrescriptions";
import PrescriptionDetailsModal from "@/components/pharmacy/PrescriptionDetailsModal";
import {
  Pill,
  Filter,
  ClipboardList,
  Activity,
  Clock,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";


export default function PatientPharmacyPage(props) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <PatientPharmacyPageInner {...props} />
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

function normalisePrescriptionsPayload(payload) {
  if (!payload) return { rows: [], total: 0 };

  // DRF paginated: { count, results: [...] }
  if (Array.isArray(payload.results)) {
    return {
      rows: payload.results,
      total:
        typeof payload.count === "number"
          ? payload.count
          : payload.results.length,
    };
  }

  // Plain list
  if (Array.isArray(payload)) {
    return { rows: payload, total: payload.length };
  }

  // Fallback: object keyed by index
  if (payload && typeof payload === "object") {
    const numericKeys = Object.keys(payload).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) {
      const rows = numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => payload[k]);
      return { rows, total: rows.length };
    }
  }

  return { rows: [], total: 0 };
}

function PatientPharmacyPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(searchParams.get("page") || 1) || 1;
  const limit = Number(searchParams.get("limit") || 20) || 20;
  const status = searchParams.get("status") || "";
  const start = searchParams.get("start") || "";
  const end = searchParams.get("end") || "";
  const s = searchParams.get("s") || "";

  // Backend already scopes prescriptions to the authenticated patient
  const { data, error, isLoading } = usePrescriptions({
    page,
    limit,
    status,
    start,
    end,
    s,
  });

  const { rows, total } = normalisePrescriptionsPayload(data);

  const stats = rows.reduce(
    (acc, rx) => {
      const v = String(rx.status || "").toUpperCase();
      if (v === "DRAFT") acc.draft += 1;
      else if (v === "PRESCRIBED") acc.prescribed += 1;
      else if (v === "PARTIALLY_DISPENSED") acc.partial += 1;
      else if (v === "DISPENSED") acc.dispensed += 1;
      else if (v === "CANCELLED") acc.cancelled += 1;
      return acc;
    },
    {
      draft: 0,
      prescribed: 0,
      partial: 0,
      dispensed: 0,
      cancelled: 0,
    }
  );

  const activeCount = stats.prescribed + stats.partial;

  // 🔹 Details modal state
  const [detailsId, setDetailsId] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  function updateQuery(patch) {
    const params = new URLSearchParams(searchParams?.toString() || "");

    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    if (
      "status" in patch ||
      "s" in patch ||
      "start" in patch ||
      "end" in patch ||
      "limit" in patch
    ) {
      params.set("page", "1");
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  if (isLoading && !data) {
    return (
      <main className="mx-auto max-w-5xl p-6 md:p-10">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          My medications
        </h1>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading your prescriptions…
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-6 md:p-10">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          My medications
        </h1>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Failed to load prescriptions: {error.message || "Unknown error"}
        </div>
      </main>
    );
  }

  return (
    <main className="relative mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      {/* soft background glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-sky-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-emerald-100/60 blur-3xl" />

      {/* Header */}
      <header className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-sky-700">
            <Pill className="h-3.5 w-3.5" />
            Patient · Medications
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            My medications
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            See prescriptions recorded for you, with status and instructions.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <StatCard
            label="Active prescriptions (page)"
            value={activeCount}
            icon={ClipboardList}
            accent="from-sky-500 via-sky-600 to-sky-700"
          />
          <StatCard
            label="Dispensed (page)"
            value={stats.dispensed}
            icon={Activity}
            accent="from-emerald-500 via-emerald-600 to-emerald-700"
          />
        </div>
      </header>

      {/* Filters */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />

        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              Filters
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative w-full sm:w-64">
                <input
                  type="search"
                  placeholder="Search drug or note…"
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
                <option value="DRAFT">Draft</option>
                <option value="PRESCRIBED">Prescribed</option>
                <option value="PARTIALLY_DISPENSED">Partially dispensed</option>
                <option value="DISPENSED">Dispensed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <input
                type="date"
                value={start}
                onChange={(e) => updateQuery({ start: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-40"
              />

              <input
                type="date"
                value={end}
                onChange={(e) => updateQuery({ end: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-40"
              />

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
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <Th>Created</Th>
                <Th>Medications</Th>
                <Th>Status</Th>
                <Th>Instructions</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.length ? (
                rows.map((rx) => {
                  const created = formatDateTime(rx.created_at);

                  const items = Array.isArray(rx.items) ? rx.items : [];
                  const itemLines = items.map((it) => {
                    const drugName =
                      it.drug?.name ||
                      it.drug?.code ||
                      it.dose ||
                      "Medication";
                    const dose = it.dose || "";
                    const freq = it.frequency || "";
                    const duration = it.duration_days
                      ? `${it.duration_days} days`
                      : "";
                    const remaining =
                      typeof it.remaining === "number"
                        ? `Remaining: ${it.remaining}`
                        : "";
                    return {
                      id: it.id,
                      label: drugName,
                      dose,
                      freq,
                      duration,
                      remaining,
                    };
                  });

                  const note = rx.note || "";

                  return (
                    <tr
                      key={rx.id}
                      className="transition hover:bg-slate-50/60"
                    >
                      <Td>
                        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-700">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {created}
                        </span>
                      </Td>
                      <Td>
                        {itemLines.length ? (
                          <ul className="space-y-1">
                            {itemLines.map((it) => (
                              <li
                                key={it.id}
                                className="text-xs text-slate-800"
                              >
                                <span className="font-medium">
                                  {it.label}
                                </span>
                                {it.dose && (
                                  <span className="text-slate-600">
                                    {` · ${it.dose}`}
                                  </span>
                                )}
                                {it.freq && (
                                  <span className="text-slate-600">
                                    {` · ${it.freq}`}
                                  </span>
                                )}
                                {it.duration && (
                                  <span className="text-slate-600">
                                    {` · ${it.duration}`}
                                  </span>
                                )}
                                {it.remaining && (
                                  <span className="ml-1 text-[11px] text-slate-500">
                                    ({it.remaining})
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </Td>
                      <Td>
                        <StatusPill value={rx.status} />
                      </Td>
                      <Td>
                        <div className="space-y-1">
                          {note && (
                            <p className="text-xs text-slate-700">{note}</p>
                          )}
                          {items.some((it) => it.instruction) && (
                            <ul className="space-y-0.5 text-[11px] text-slate-600">
                              {items
                                .filter((it) => it.instruction)
                                .map((it) => (
                                  <li key={it.id}>• {it.instruction}</li>
                                ))}
                            </ul>
                          )}
                          {!note &&
                            !items.some((it) => it.instruction) && (
                              <span className="text-xs text-slate-400">
                                No additional instructions recorded.
                              </span>
                            )}
                        </div>
                      </Td>
                      <Td>
                        <button
                          type="button"
                          onClick={() => {
                            setDetailsId(rx.id);
                            setDetailsOpen(true);
                          }}
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-sky-700 hover:border-sky-300 hover:bg-sky-50"
                        >
                          View
                        </button>
                      </Td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
                      <Pill className="h-6 w-6 text-slate-400" />
                    </div>
                    <div className="text-sm font-medium text-slate-900">
                      No prescriptions found
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Adjust your filters or check back later.
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
            Page {page} · Showing {rows.length} of {total} prescription
            {total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => updateQuery({ page: Math.max(1, page - 1) })}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 font-medium hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <button
              type="button"
              disabled={rows.length < limit}
              onClick={() => updateQuery({ page: page + 1 })}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 font-medium hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
            >
              Next
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Details modal */}
      <PrescriptionDetailsModal
        open={detailsOpen}
        id={detailsId}
        onClose={() => setDetailsOpen(false)}
      />
    </main>
  );
}

function Th({ children }) {
  return (
    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
      {children}
    </th>
  );
}

function Td({ children }) {
  return (
    <td className="px-3 py-3 align-top text-xs text-slate-800">{children}</td>
  );
}

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
      <div className="flex items-center justify-between p-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {value}
          </div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ value }) {
  const v = String(value || "").toUpperCase();
  const label =
    v === "PARTIALLY_DISPENSED"
      ? "Partially dispensed"
      : v === "PRESCRIBED"
      ? "Prescribed"
      : v === "DISPENSED"
      ? "Dispensed"
      : v === "DRAFT"
      ? "Draft"
      : v === "CANCELLED"
      ? "Cancelled"
      : v || "Unknown";

  let cls = "bg-slate-50 text-slate-700 ring-slate-200";
  if (v === "PRESCRIBED") {
    cls = "bg-sky-50 text-sky-700 ring-sky-200";
  } else if (v === "PARTIALLY_DISPENSED") {
    cls = "bg-amber-50 text-amber-700 ring-amber-200";
  } else if (v === "DISPENSED") {
    cls = "bg-emerald-50 text-emerald-700 ring-emerald-200";
  } else if (v === "CANCELLED") {
    cls = "bg-rose-50 text-rose-700 ring-rose-200";
  }

  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-medium ring-1 ${cls}`}
    >
      {label}
    </span>
  );
}
