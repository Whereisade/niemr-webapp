"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { markLabOrderCollected } from "@/lib/labsStatusActions";
import { getLabStatusMeta } from "@/lib/LabsUiConfig";
import {
  FlaskConical,
  Search,
  Filter,
  Clock,
  ArrowLeft,
  ArrowRight,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Building2,
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

function normalizeList(body) {
  if (!body) return [];
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body)) return body;
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

export default function IndependentLabOrdersPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(sp.get("page") || 1);
  const limit = Number(sp.get("limit") || 20);
  const status = sp.get("status") || "";
  const s = sp.get("s") || "";

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);

  const [collectingId, setCollectingId] = useState(null);

  // Load current user
  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      try {
        const res = await fetch("/api/proxy/accounts/me/", {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Failed to load user");
        const json = await res.json();
        if (!cancelled) setMe(json);
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    }
    loadMe();
    return () => { cancelled = true; };
  }, []);

  const meRole = (me?.role || "").toUpperCase();
  const isLabRole = meRole === "LAB";

  // Load orders assigned to this independent lab
  async function loadOrders() {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("limit", String(limit));
      if (status) qs.set("status", status);
      if (s) qs.set("s", s);

      const res = await apiFetch(`/labs/orders/?${qs.toString()}`, { method: "GET" });
      const items = normalizeList(res);
      setOrders(items);
      setTotal(res?.count ?? items.length);
    } catch (err) {
      setError(err?.message || "Failed to load lab orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, status, s]);

  const updateQuery = (patch) => {
    const params = new URLSearchParams(sp?.toString() || "");
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") {
        params.delete(k);
      } else {
        params.set(k, String(v));
      }
    });
    if ("status" in patch || "s" in patch || "limit" in patch) {
      params.set("page", "1");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  async function handleCollect(orderId) {
    if (!orderId) return;
    setCollectingId(orderId);
    try {
      await markLabOrderCollected(orderId);
      await loadOrders();
    } catch (err) {
      alert(err?.message || "Failed to mark samples collected.");
    } finally {
      setCollectingId(null);
    }
  }

  // Quick stats
  const pendingCount = orders.filter((o) => String(o.status || "").toUpperCase() === "PENDING").length;
  const inProgressCount = orders.filter((o) => String(o.status || "").toUpperCase() === "IN_PROGRESS").length;
  const completedCount = orders.filter((o) => String(o.status || "").toUpperCase() === "COMPLETED").length;

  if (meLoading) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </main>
    );
  }

  if (!isLabRole) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-lg font-semibold text-amber-900">Access Restricted</h1>
          <p className="mt-2 text-sm text-amber-800">
            This page is for independent lab scientists. Your current role is: <strong>{me?.role || "Unknown"}</strong>
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1 rounded-full bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      {/* Background accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-teal-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-cyan-100 blur-3xl opacity-60" />

      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-teal-700">
            <FlaskConical className="h-3.5 w-3.5" />
            Independent Lab Worklist
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Lab Orders Assigned to You
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            View and process lab orders outsourced to your independent lab practice.
          </p>
        </div>

        <button
          type="button"
          onClick={loadOrders}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      {/* Quick stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total Orders"
          value={total}
          accent="from-teal-600 via-cyan-500 to-sky-500"
        />
        <StatTile
          label="Pending Collection"
          value={pendingCount}
          accent="from-amber-600 via-orange-500 to-red-500"
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

      {/* Filters */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-teal-600 via-cyan-500 to-sky-500" />
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search tests / notes…"
              defaultValue={s}
              onKeyDown={(e) => {
                if (e.key === "Enter") updateQuery({ s: e.currentTarget.value });
              }}
              onBlur={(e) => updateQuery({ s: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
              <Filter className="h-4 w-4 text-slate-400" />
              Filters
            </div>

            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 sm:w-40"
              value={status}
              onChange={(e) => updateQuery({ status: e.target.value })}
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 sm:w-32"
              value={String(limit)}
              onChange={(e) => updateQuery({ limit: e.target.value })}
            >
              <option value="20">Show 20</option>
              <option value="50">Show 50</option>
              <option value="100">Show 100</option>
            </select>
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
              <FlaskConical className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Lab Orders</h2>
              <p className="text-xs text-slate-500">{total} order{total === 1 ? "" : "s"} assigned to you</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <Th>Patient</Th>
                <Th>Facility</Th>
                <Th>Tests</Th>
                <Th>Status</Th>
                <Th>Ordered</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && !orders.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
                    <p className="mt-2">Loading orders…</p>
                  </td>
                </tr>
              ) : orders.length ? (
                orders.map((order) => {
                  const statusNorm = String(order.status || "").toUpperCase();
                  const { label: statusLabel, badgeClass } = getLabStatusMeta(order.status);

                  return (
                    <tr key={order.id} className="transition hover:bg-slate-50/60">
                      <Td>
                        <div className="font-medium text-slate-900">
                          {order.patient_name || `Patient #${order.patient}` || "—"}
                        </div>
                      </Td>

                      <Td>
                        <div className="flex items-center gap-1 text-slate-700">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {order.facility_name || order.facility?.name || `Facility #${order.facility}` || "—"}
                        </div>
                      </Td>

                      <Td>
                        <div className="max-w-xs">
                          {Array.isArray(order.items) && order.items.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {order.items.slice(0, 3).map((i, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                                >
                                  {i.display_name || i.test?.name || i.requested_name || "Test"}
                                </span>
                              ))}
                              {order.items.length > 3 && (
                                <span className="text-xs text-slate-500">+{order.items.length - 3} more</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </div>
                      </Td>

                      <Td>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}>
                          {statusLabel}
                        </span>
                      </Td>

                      <Td>
                        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {formatDateTime(order.ordered_at)}
                        </div>
                      </Td>

                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/lab/orders/${order.id}`}
                            className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700"
                          >
                            {statusNorm === "PENDING" || statusNorm === "IN_PROGRESS"
                              ? "Enter Results"
                              : "View Details"}
                          </Link>

                          {statusNorm === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => handleCollect(order.id)}
                              disabled={collectingId === order.id}
                              className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-60"
                            >
                              {collectingId === order.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              Collect
                            </button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
                      <FlaskConical className="h-6 w-6 text-slate-400" />
                    </div>
                    <div className="text-sm font-medium text-slate-900">No lab orders found</div>
                    <div className="mt-1 text-sm text-slate-500">
                      Orders outsourced to you will appear here.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pager */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          <div>Page {page} · {total} total</div>
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
              disabled={orders.length < limit}
              onClick={() => updateQuery({ page: page + 1 })}
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

/* ─────────────── UI helpers ─────────────── */

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
    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 ${className}`}>
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