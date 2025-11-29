// app/facility/audit/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchAuditLogs } from "@/lib/audit";
import {
  Shield,
  Search,
  Filter,
  Globe,
  UserRound,
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

function normalizeAuditResponse(res) {
  if (!res) return [];
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object") {
    const numericKeys = Object.keys(res).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => res[k]);
    }
  }
  return [];
}

export default function FacilityAuditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");

  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "20");
  const q = searchParams.get("q") || "";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetchAuditLogs({ page, limit, q });

        if (cancelled) return;

        setData(res);
        setRows(normalizeAuditResponse(res));
      } catch (err) {
        console.error("Failed to load audit logs", err);
        if (!cancelled) {
          setError(
            err?.message || "Failed to load audit logs. Please try again."
          );
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [page, limit, q]);

  const total = Number(data?.count ?? rows.length);
  const hasNextPage = rows.length === limit;
  const hasPrevPage = page > 1;

  function goToPage(nextPage) {
    const sp = new URLSearchParams(searchParams.toString());
    if (nextPage && nextPage > 1) {
      sp.set("page", String(nextPage));
    } else {
      sp.delete("page");
    }
    router.push(`/facility/audit?${sp.toString()}`);
  }

  function applySearch(newQ) {
    const sp = new URLSearchParams(searchParams.toString());
    if (newQ) {
      sp.set("q", newQ);
    } else {
      sp.delete("q");
    }
    sp.delete("page"); // reset to first page
    router.push(`/facility/audit?${sp.toString()}`);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    applySearch(searchInput.trim());
  }

  const uniqueUsers = new Set(
    rows.map((r) => r.user_name || r.user || r.username).filter(Boolean)
  ).size;

  return (
    <main className="relative mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      {/* Soft glow background accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100/60 blur-3xl" />

      {/* Header */}
      <header className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <Shield className="h-3.5 w-3.5" />
            Facility · Audit Trail
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Audit logs
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            A chronological trail of actions across this facility—who did what,
            where, and when.
          </p>
        </div>

        {/* Search box */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex w-full max-w-md items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm"
        >
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filter by user, action, path, IP…"
            className="flex-1 border-none bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Search
          </button>
        </form>
      </header>

      {/* Quick stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={Activity}
          label="Records on page"
          value={rows.length}
          accent="from-blue-600 via-indigo-600 to-violet-600"
        />
        <StatTile
          icon={UserRound}
          label="Unique users (page)"
          value={uniqueUsers}
          accent="from-emerald-600 via-teal-600 to-cyan-600"
        />
        <StatTile
          icon={Shield}
          label="Total (all pages)"
          value={total}
          accent="from-fuchsia-600 via-pink-600 to-rose-600"
        />
        <StatTile
          icon={Globe}
          label="Current filter"
          value={q ? `"${q}"` : "None"}
          accent="from-amber-600 via-orange-600 to-red-600"
          isText
        />
      </section>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <Filter className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <Th>When</Th>
                <Th>User</Th>
                <Th>Method</Th>
                <Th>Path</Th>
                <Th>Status</Th>
                <Th>IP</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-6 text-center text-sm text-slate-500"
                  >
                    Loading audit logs…
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((log) => {
                  const ts =
                    log.timestamp || log.created_at || log.request_at;
                  const user =
                    log.user_name || log.user || log.username || "—";
                  const method = log.method || log.http_method || "—";
                  const path =
                    log.path ||
                    log.url_path ||
                    log.request_path ||
                    "—";
                  const status =
                    log.status_code || log.response_status || "—";
                  const ip =
                    log.ip_address || log.remote_addr || "—";

                  return (
                    <tr
                      key={log.id}
                      className="transition hover:bg-slate-50/60"
                    >
                      <Td>
                        <span className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-700">
                          {formatDateTime(ts)}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-600/10">
                            <UserRound className="h-4 w-4 text-blue-700" />
                          </span>
                          <span className="text-xs font-medium text-slate-900">
                            {user}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <MethodPill value={method} />
                      </Td>
                      <Td>
                        <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-800">
                          {path}
                        </span>
                      </Td>
                      <Td>
                        <StatusPill value={status} />
                      </Td>
                      <Td>
                        <span className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-700">
                          {ip}
                        </span>
                      </Td>
                    </tr>
                  );
                })}

              {!loading && !rows.length && !error && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
                      <Shield className="h-6 w-6 text-slate-400" />
                    </div>
                    <div className="text-sm font-medium text-slate-900">
                      No audit entries found
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Adjust your filters or try a different search query.
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
            Page {page} · {rows.length} log
            {rows.length === 1 ? "" : "s"} on page · {total} total
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={!hasPrevPage}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 font-medium hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={!hasNextPage}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 font-medium hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
            >
              Next
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ─────────────── UI helpers ─────────────── */

function StatTile({ icon: Icon, label, value, accent, isText = false }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-slate-600">{label}</div>
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50">
            <Icon className="h-4 w-4 text-slate-700" />
          </div>
        </div>
        <div
          className={`mt-2 ${
            isText
              ? "text-[13px] text-slate-900"
              : "text-2xl font-semibold text-slate-900"
          }`}
        >
          {value}
        </div>
      </div>
    </div>
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
  return <td className="px-3 py-3 align-top text-xs text-slate-800">{children}</td>;
}

function MethodPill({ value }) {
  const v = String(value || "").toUpperCase();
  const map = {
    GET: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    POST: "bg-blue-50 text-blue-700 ring-blue-200",
    PUT: "bg-amber-50 text-amber-700 ring-amber-200",
    PATCH: "bg-purple-50 text-purple-700 ring-purple-200",
    DELETE: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  const cls = map[v] || "bg-slate-50 text-slate-700 ring-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-medium ring-1 ${cls}`}
    >
      {v || "—"}
    </span>
  );
}

function StatusPill({ value }) {
  const code = Number(value) || null;
  let variant = "bg-slate-50 text-slate-700 ring-slate-200";

  if (code && code >= 200 && code < 300) {
    variant = "bg-emerald-50 text-emerald-700 ring-emerald-200";
  } else if (code && code >= 300 && code < 400) {
    variant = "bg-blue-50 text-blue-700 ring-blue-200";
  } else if (code && code >= 400 && code < 500) {
    variant = "bg-amber-50 text-amber-700 ring-amber-200";
  } else if (code && code >= 500) {
    variant = "bg-rose-50 text-rose-700 ring-rose-200";
  }

  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-medium ring-1 ${variant}`}
    >
      {code || value || "—"}
    </span>
  );
}
