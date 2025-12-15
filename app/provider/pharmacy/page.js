"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { usePrescriptions } from "@/lib/usePrescriptions";
import PrescriptionDetailsModal from "@/components/pharmacy/PrescriptionDetailsModal";
import {
  Pill,
  Filter,
  UsersRound,
  ClipboardList,
  Clock,
  Activity,
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

function getPrescriberId(rx) {
  const v = rx?.prescribed_by;
  if (!v) return null;
  if (typeof v === "object") {
    return v.id ?? null;
  }
  return v;
}

export default function ProviderPharmacyPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(sp.get("page") || 1) || 1;
  const limit = Number(sp.get("limit") || 20) || 20;
  const status = sp.get("status") || "";
  const patient = sp.get("patient") || "";
  const start = sp.get("start") || "";
  const end = sp.get("end") || "";
  const s = sp.get("s") || "";

  const { data, error, isLoading } = usePrescriptions({
    page,
    limit,
    status,
    patient,
    start,
    end,
    s,
  });

  // Current user – to know which prescriptions are "mine"
  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);
  const [onlyMine, setOnlyMine] = useState(true);

  // Details modal state
  const [detailsId, setDetailsId] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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
        console.error("Failed to fetch /accounts/me/ in provider pharmacy:", err);
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

  const meId = me?.id ?? null;
  const meRole = (me?.role || "").toUpperCase();
  const providerType = (me?.provider?.provider_type || "").toUpperCase();

  const isProviderPharmacist =
    meRole === "PHARMACY" || providerType === "PHARMACIST";

  const { rows: rawRows, total } = normalisePrescriptionsPayload(data);

  // "My prescriptions" filter is applied client-side on the current page
  const rows = useMemo(() => {
    if (!onlyMine || !meId) return rawRows;
    return rawRows.filter((rx) => getPrescriberId(rx) === meId);
  }, [rawRows, onlyMine, meId]);

  const stats = useMemo(() => {
    let draft = 0;
    let prescribed = 0;
    let partial = 0;
    let dispensed = 0;
    let cancelled = 0;

    for (const rx of rows) {
      const v = String(rx.status || "").toUpperCase();
      if (v === "DRAFT") draft += 1;
      else if (v === "PRESCRIBED") prescribed += 1;
      else if (v === "PARTIALLY_DISPENSED") partial += 1;
      else if (v === "DISPENSED") dispensed += 1;
      else if (v === "CANCELLED") cancelled += 1;
    }

    const pendingOnPage = prescribed + partial;
    return { draft, prescribed, partial, dispensed, cancelled, pendingOnPage };
  }, [rows]);

  function updateQuery(patch) {
    const params = new URLSearchParams(sp?.toString() || "");

    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    if (
      "status" in patch ||
      "patient" in patch ||
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
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          Provider pharmacy
        </h1>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading prescriptions…
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          Provider pharmacy
        </h1>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Failed to load prescriptions: {error.message || "Unknown error"}
        </div>
      </main>
    );
  }

  const headerTitle = isProviderPharmacist
    ? "Pharmacy workspace"
    : "My prescriptions";

  const headerSubtitle = isProviderPharmacist
    ? "Review prescriptions you’re involved with across facilities. Dispensing stays in the facility workspace."
    : "View and track medications you’ve prescribed for your patients.";

  return (
    <main className="relative mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      {/* Soft background glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-sky-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100/60 blur-3xl" />

      {/* Header */}
      <header className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-sky-700">
            <Pill className="h-3.5 w-3.5" />
            Provider · Pharmacy
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {headerTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{headerSubtitle}</p>
        </div>

        {/* Actions + stats */}
        <div className="flex flex-col items-end gap-3">
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href="/provider/pharmacy/catalog"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800"
            >
              View catalog
            </Link>
            <Link
              href="/provider/pharmacy/stock"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50"
            >
              View stock
            </Link>
          </div>

          {/* Page-level stats (current page, filtered) */}
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            <StatCard
              label={onlyMine ? "My pending (page)" : "Pending (page)"}
              value={stats.pendingOnPage}
              icon={ClipboardList}
              accent="from-sky-500 via-sky-600 to-sky-700"
            />
            <StatCard
              label={onlyMine ? "My dispensed (page)" : "Dispensed (page)"}
              value={stats.dispensed}
              icon={Activity}
              accent="from-emerald-500 via-emerald-600 to-emerald-700"
            />
            <StatCard
              label="Total results (raw)"
              value={total}
              icon={UsersRound}
              accent="from-slate-500 via-slate-600 to-slate-700"
            />
          </div>
        </div>
      </header>

      {/* My vs All toggle */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-600">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          <span className="font-medium">
            View scope is applied on this page only
          </span>
        </div>

        <div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 text-xs shadow-sm">
          <button
            type="button"
            onClick={() => setOnlyMine(true)}
            className={
              "rounded-full px-3 py-1.5 font-medium transition " +
              (onlyMine
                ? "bg-sky-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50")
            }
          >
            My prescriptions (page)
          </button>
          <button
            type="button"
            onClick={() => setOnlyMine(false)}
            className={
              "rounded-full px-3 py-1.5 font-medium transition " +
              (!onlyMine
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50")
            }
          >
            All facility prescriptions (page)
          </button>
        </div>
      </section>

      {/* Filters + table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />

        {/* Filters */}
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
                  placeholder="Search drug / note / patient…"
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

              <input
                type="text"
                placeholder="Patient ID…"
                defaultValue={patient}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateQuery({ patient: e.currentTarget.value });
                  }
                }}
                onBlur={(e) => updateQuery({ patient: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-40"
              />

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
                <Th>Patient</Th>
                <Th>Items</Th>
                <Th>Status</Th>
                <Th>Note</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.length ? (
                rows.map((rx) => {
                  const created = formatDateTime(rx.created_at);
                  const patientLabel =
                    rx.patient != null ? `Patient #${rx.patient}` : "—";

                  let itemsSummary = "—";
                  if (Array.isArray(rx.items) && rx.items.length) {
                    const names = rx.items
                      .map(
                        (it) =>
                          it.drug?.name ||
                          it.drug?.code ||
                          it.dose ||
                          "Medication"
                      )
                      .filter(Boolean);
                    if (names.length <= 2) {
                      itemsSummary = names.join(", ");
                    } else {
                      itemsSummary = `${names.slice(0, 2).join(", ")} + ${
                        names.length - 2
                      } more`;
                    }
                  }

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
                        <span className="text-xs font-medium text-slate-900">
                          {patientLabel}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-700">
                          {itemsSummary}
                        </span>
                      </Td>
                      <Td>
                        <StatusPill value={rx.status} />
                      </Td>
                      <Td>
                        <span className="line-clamp-2 text-xs text-slate-600">
                          {rx.note || "—"}
                        </span>
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
                    colSpan={6}
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
            {total === 1 ? "" : "s"} (raw)
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
              disabled={rawRows.length < limit}
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
