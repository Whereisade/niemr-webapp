// app/patient/labs/page.js
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getLabStatusMeta } from "@/lib/LabsUiConfig";
import {
  FlaskConical,
  Search,
  Filter,
  Clock,
  Building2,
  UserRound,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

export default function PatientLabOrdersPage(props) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <PatientLabOrdersPageInner {...props} />
    </Suspense>
  );
}

function formatDateTime(value) {
  if (!value) return "\u2014";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

function normalizeLabOrdersPayload(body) {
  if (!body) return [];

  // DRF paginated: { count, results: [...] }
  if (Array.isArray(body.results)) {
    return body.results;
  }

  // Plain list: [...]
  if (Array.isArray(body)) {
    return body;
  }

  // Weird numeric-key object from BFF spread
  if (body && typeof body === "object") {
    const numericKeys = Object.keys(body).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => body[k]);
    }
  }

  return [];
}

function PatientLabOrdersPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "10");
  const status = searchParams.get("status") || "";
  const s = searchParams.get("s") || "";

  const [searchText, setSearchText] = useState(s);

  useEffect(() => {
    // keep input in sync when user navigates with back/forward
    setSearchText(s);
  }, [s]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const qs = new URLSearchParams();
        qs.set("page", String(page));
        qs.set("limit", String(limit));
        qs.set("mine", "true");
        if (status) qs.set("status", status);
        if (s) qs.set("s", s);

        const body = await apiFetch(`/labs/orders/?${qs.toString()}`, {
          method: "GET",
        });

        if (cancelled) return;

        setData(body);
        const items = normalizeLabOrdersPayload(body);
        setRows(items);
      } catch (err) {
        console.error("Failed to load patient lab orders", err);
        if (!cancelled) {
          setError(err?.message || "Failed to load lab orders. Please try again.");
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [page, limit, status, s]);

  const hasNextPage = rows.length === limit;
  const hasPrevPage = page > 1;

  function goToPage(nextPage) {
    const sp = new URLSearchParams(searchParams.toString());
    if (nextPage && nextPage > 1) {
      sp.set("page", String(nextPage));
    } else {
      sp.delete("page");
    }
    router.push(`/patient/labs?${sp.toString()}`);
  }

  function applyStatusFilter(nextStatus) {
    const sp = new URLSearchParams(searchParams.toString());
    if (nextStatus) {
      sp.set("status", nextStatus);
    } else {
      sp.delete("status");
    }
    sp.delete("page");
    router.push(`/patient/labs?${sp.toString()}`);
  }

  function applySearch(nextS) {
    const sp = new URLSearchParams(searchParams.toString());
    const v = (nextS || "").trim();
    if (v) sp.set("s", v);
    else sp.delete("s");
    sp.delete("page");
    router.push(`/patient/labs?${sp.toString()}`);
  }

  const totalCount = useMemo(() => {
    if (data && typeof data === "object" && typeof data.count === "number") return data.count;
    return rows.length;
  }, [data, rows.length]);

  const pendingCount = rows.filter(
    (o) => String(o.status || "").toUpperCase() === "PENDING"
  ).length;
  const inProgressCount = rows.filter(
    (o) => String(o.status || "").toUpperCase() === "IN_PROGRESS"
  ).length;
  const completedCount = rows.filter(
    (o) => String(o.status || "").toUpperCase() === "COMPLETED"
  ).length;

  return (
    <main className="relative mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <div className="pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full bg-emerald-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-sky-100 blur-3xl opacity-60" />

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-700">
            <FlaskConical className="h-3.5 w-3.5" />
            Patient Lab Orders
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            My Lab Tests
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Track lab tests ordered for you, their status, and when results were reported.
          </p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total Orders"
          value={totalCount}
          accent="from-emerald-600 via-teal-500 to-cyan-500"
        />
        <StatTile
          label="Pending Collection"
          value={pendingCount}
          accent="from-amber-600 via-orange-500 to-rose-500"
        />
        <StatTile
          label="In Progress"
          value={inProgressCount}
          accent="from-sky-600 via-blue-500 to-indigo-500"
        />
        <StatTile
          label="Completed"
          value={completedCount}
          accent="from-emerald-600 via-green-500 to-lime-500"
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500" />
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search tests / notes..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySearch(e.currentTarget.value);
              }}
              onBlur={(e) => applySearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
              <Filter className="h-4 w-4 text-slate-400" />
              Filters
            </div>

            <select
              value={status}
              onChange={(e) => applyStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:w-52"
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending collection</option>
              <option value="IN_PROGRESS">Sample collected</option>
              <option value="COMPLETED">Reported</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
              <FlaskConical className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Lab Orders</h2>
              <p className="text-xs text-slate-500">
                {totalCount} order{totalCount === 1 ? "" : "s"} found
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            {status ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700">
                Filter: {getLabStatusMeta(status).label}
              </span>
            ) : null}
            {s ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700">
                Search: "{s}"
                <button
                  type="button"
                  onClick={() => applySearch("")}
                  className="text-slate-500 hover:text-slate-900"
                  aria-label="Clear search"
                >
                  x
                </button>
              </span>
            ) : null}
          </div>
        </div>

        <div className="md:hidden">
          <div className="divide-y divide-slate-100">
            {loading && (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
                  <FlaskConical className="h-6 w-6 text-slate-400" />
                </div>
                <p className="mt-2">Loading lab orders...</p>
              </div>
            )}

            {!loading &&
              rows.map((order) => {
                const testsText = Array.isArray(order.items)
                  ? order.items
                      .map(
                        (i) =>
                          i.test?.name ||
                          i.test?.code ||
                          i.test_name ||
                          i.code
                      )
                      .join(", ")
                  : order.tests_display || "\u2014";

                const isIndependentLab =
                  Boolean(order.outsourced_to_name) ||
                  Boolean(order.outsourced_to) ||
                  Boolean(order.external_lab_name);

                const providerName =
                  order.outsourced_to_name ||
                  order.outsourced_to?.display_name ||
                  order.outsourced_to?.name ||
                  order.external_lab_name ||
                  order.facility_name ||
                  order.facility?.display_name ||
                  order.facility?.name ||
                  "\u2014";

                const orderedByName =
                  order.ordered_by_name ||
                  (order.ordered_by_first_name || order.ordered_by_last_name
                    ? `${order.ordered_by_first_name || ""} ${
                        order.ordered_by_last_name || ""
                      }`.trim()
                    : "") ||
                  order.ordered_by ||
                  "\u2014";

                const { label, badgeClass } = getLabStatusMeta(order.status);

                return (
                  <article key={order.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-600/10">
                            <UserRound className="h-4 w-4 text-emerald-700" />
                          </span>
                          <div className="font-medium text-slate-900">
                            {orderedByName}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          {isIndependentLab ? (
                            <FlaskConical className="h-3.5 w-3.5 text-slate-400" />
                          ) : (
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          <span className="font-medium text-slate-700">{providerName}</span>
                          <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            {isIndependentLab ? "Independent lab" : "Facility"}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}
                      >
                        {label}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Tests
                        </p>
                        <p className="text-slate-800 line-clamp-2">{testsText}</p>
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {formatDateTime(order.ordered_at || order.created_at)}
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Note</p>
                        <p className="text-slate-800 line-clamp-2">
                          {order.note || "\u2014"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/patient/labs/${order.id}`}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </article>
                );
              })}

            {!loading && !rows.length && !error && (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
                  <FlaskConical className="h-6 w-6 text-slate-400" />
                </div>
                <div className="text-sm font-medium text-slate-900">
                  No lab tests found
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Lab orders for you will appear here.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Ordered</Th>
                  <Th>Tests</Th>
                  <Th>Status</Th>
                  <Th>Provider</Th>
                  <Th>Ordered by</Th>
                  <Th>Note</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-sm text-slate-500">
                      Loading lab orders...
                    </td>
                  </tr>
                )}

                {!loading &&
                  rows.map((order) => {
                    const testsText = Array.isArray(order.items)
                      ? order.items
                          .map(
                            (i) =>
                              i.test?.name ||
                              i.test?.code ||
                              i.test_name ||
                              i.code
                          )
                          .join(", ")
                      : order.tests_display || "\u2014";

                    const isIndependentLab =
                      Boolean(order.outsourced_to_name) ||
                      Boolean(order.outsourced_to) ||
                      Boolean(order.external_lab_name);

                    const providerName =
                      order.outsourced_to_name ||
                      order.outsourced_to?.display_name ||
                      order.outsourced_to?.name ||
                      order.external_lab_name ||
                      order.facility_name ||
                      order.facility?.display_name ||
                      order.facility?.name ||
                      "\u2014";

                    const orderedByName =
                      order.ordered_by_name ||
                      (order.ordered_by_first_name || order.ordered_by_last_name
                        ? `${order.ordered_by_first_name || ""} ${
                            order.ordered_by_last_name || ""
                          }`.trim()
                        : "") ||
                      order.ordered_by ||
                      "\u2014";

                    const { label, badgeClass } = getLabStatusMeta(order.status);

                    return (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <Td>
                          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {formatDateTime(order.ordered_at || order.created_at)}
                          </div>
                        </Td>
                        <Td>
                          <div className="max-w-xs truncate text-slate-800">
                            {testsText}
                          </div>
                        </Td>
                        <Td>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}
                          >
                            {label}
                          </span>
                        </Td>
                        <Td>
                          <div className="flex flex-wrap items-center gap-2 text-slate-700">
                            <div className="flex items-center gap-1">
                              {isIndependentLab ? (
                                <FlaskConical className="h-3.5 w-3.5 text-slate-400" />
                              ) : (
                                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                              )}
                              <span className="max-w-[220px] truncate">{providerName}</span>
                            </div>
                            <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              {isIndependentLab ? "Independent lab" : "Facility"}
                            </span>
                          </div>
                        </Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-600/10">
                              <UserRound className="h-3.5 w-3.5 text-emerald-700" />
                            </span>
                            <div className="text-slate-800">{orderedByName}</div>
                          </div>
                        </Td>
                        <Td>
                          <span className="line-clamp-2 text-slate-700">
                            {order.note || "\u2014"}
                          </span>
                        </Td>
                        <Td className="text-right">
                          <Link
                            href={`/patient/labs/${order.id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            View
                          </Link>
                        </Td>
                      </tr>
                    );
                  })}

                {!loading && !rows.length && !error && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-sm text-slate-500">
                      No lab tests found for your account yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          <span>
            Page {page} ? Showing {rows.length} lab order
            {rows.length === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={!hasPrevPage}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 shadow-sm hover:border-slate-300 disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={!hasNextPage}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 shadow-sm hover:border-slate-300 disabled:opacity-50"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatTile({ label, value, accent }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
      <div className="p-5">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
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
    <td className={`px-4 py-3 align-middle text-sm text-slate-800 ${className}`}>
      {children}
    </td>
  );
}
