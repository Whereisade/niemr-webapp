// app/facility/audit/page.js
"use client";

import { Fragment, useEffect, useState, Suspense } from "react";
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
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";

export default function FacilityAuditPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <FacilityAuditPageInner />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-sm text-slate-500">Loading audit logs...</p>
      </div>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function FacilityAuditPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState({ count: 0, results: [], next: null, previous: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
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
        
        const response = await fetchAuditLogs({ page, limit, q });

        if (cancelled) return;

        setData(response);
      } catch (err) {
        console.error("Failed to load audit logs:", err);
        if (!cancelled) {
          setError(err?.message || "Failed to load audit logs. Please try again.");
          setData({ count: 0, results: [], next: null, previous: null });
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

  const rows = data.results || [];
  const total = data.count || 0;
  const hasNextPage = !!data.next;
  const hasPrevPage = !!data.previous;

  function goToPage(nextPage) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage && nextPage > 1) {
      params.set("page", String(nextPage));
    } else {
      params.delete("page");
    }
    router.push(`/facility/audit?${params.toString()}`);
  }

  function applySearch(newQ) {
    const params = new URLSearchParams(searchParams.toString());
    if (newQ) {
      params.set("q", newQ);
    } else {
      params.delete("q");
    }
    params.delete("page"); // Reset to first page
    router.push(`/facility/audit?${params.toString()}`);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    applySearch(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput("");
    applySearch("");
  }

  const uniqueUsers = new Set(
    rows.map((r) => r.actor_email || r.actor_display || r.actor).filter(Boolean)
  ).size;

  return (
    <main className="relative mx-auto max-w-7xl space-y-6 p-4 sm:p-6 md:p-10">
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
            Audit Logs
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            A chronological trail of actions across this facility—who did what, where, and when.
          </p>
        </div>

        {/* Search box */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex w-full max-w-md items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm hover:border-slate-300 transition-colors"
        >
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by user, message, or target ID..."
            className="flex-1 border-none bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              className="text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          )}
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
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

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <div>
            <div className="font-medium">Error loading audit logs</div>
            <div className="mt-0.5 text-xs text-rose-700">{error}</div>
          </div>
        </div>
      )}

      {/* Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        <div className="lg:hidden">
          {loading && (
            <div className="flex flex-col items-center gap-3 p-6 text-sm text-slate-500">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
              Loading audit logs...
            </div>
          )}
          {!loading && rows.length > 0 && (
            <div className="space-y-3 p-3 sm:p-4">
              {rows.map((log) => {
                const ts = log.created_at || log.timestamp;
                const actorDisplay = log.actor_display || log.actor_email || "System";
                const verb = log.verb || "—";
                const targetModel = log.target_model || "—";
                const targetDisplay = log.target_display || log.target_id || "—";
                const targetId = log.target_id || "";
                const message = log.message || "—";
                const ip = log.ip_address || "—";
                const hasChanges = log.changes && Object.keys(log.changes).length > 0;
                const isExpanded = expandedRow === log.id;

                return (
                  <article key={log.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700">
                        {formatDateTime(ts)}
                      </span>
                      <VerbPill value={verb} />
                    </div>

                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-600/10">
                          <UserRound className="h-4 w-4 text-blue-700" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900" title={actorDisplay}>
                            {actorDisplay}
                          </div>
                          {log.actor_email && actorDisplay !== log.actor_email && (
                            <div className="truncate text-[11px] text-slate-500" title={log.actor_email}>
                              {log.actor_email}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">Target</div>
                        <div className="truncate font-medium text-slate-900" title={targetDisplay}>
                          {targetDisplay}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-600 capitalize">
                            {targetModel}
                          </span>
                          {targetId && (
                            <span className="truncate font-mono text-[10px] text-slate-400" title={targetId}>
                              #{targetId.length > 8 ? targetId.slice(0, 8) + "…" : targetId}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">Message</div>
                        <div className="text-slate-700">{message}</div>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">IP Address</div>
                        <span className="mt-1 inline-flex rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-700">
                          {ip}
                        </span>
                      </div>

                      {hasChanges && (
                        <button
                          type="button"
                          onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                          className="mt-1 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3.5 w-3.5" />
                              Hide changes
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3.5 w-3.5" />
                              View changes
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {isExpanded && hasChanges && (
                      <div className="mt-3 rounded-lg bg-white p-2">
                        <ChangesDisplay changes={log.changes} />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          {!loading && !rows.length && !error && (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
                <Shield className="h-6 w-6 text-slate-400" />
              </div>
              <div className="text-sm font-medium text-slate-900">No audit entries found</div>
              <div className="mt-1 text-xs text-slate-500">
                {q ? "Try adjusting your search query." : "No activity recorded yet."}
              </div>
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <Th>When</Th>
                <Th>User</Th>
                <Th>Action</Th>
                <Th>Target</Th>
                <Th>Message</Th>
                <Th>IP Address</Th>
                <Th className="w-10"></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-sm text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      Loading audit logs...
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((log) => {
                  const ts = log.created_at || log.timestamp;
                  const actorDisplay = log.actor_display || log.actor_email || "System";
                  const verb = log.verb || "—";
                  const targetModel = log.target_model || "—";
                  const targetDisplay = log.target_display || log.target_id || "—";
                  const targetId = log.target_id || "";
                  const message = log.message || "—";
                  const ip = log.ip_address || "—";
                  const hasChanges = log.changes && Object.keys(log.changes).length > 0;
                  const isExpanded = expandedRow === log.id;

                  return (
                    <Fragment key={log.id}>
                      <tr className={`transition hover:bg-slate-50/60 ${isExpanded ? "bg-slate-50/40" : ""}`}>
                        <Td>
                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700">
                            {formatDateTime(ts)}
                          </span>
                        </Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-600/10">
                              <UserRound className="h-4 w-4 text-blue-700" />
                            </span>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-slate-900 max-w-[140px] truncate" title={actorDisplay}>
                                {actorDisplay}
                              </span>
                              {log.actor_email && actorDisplay !== log.actor_email && (
                                <span className="text-[10px] text-slate-500 max-w-[140px] truncate" title={log.actor_email}>
                                  {log.actor_email}
                                </span>
                              )}
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <VerbPill value={verb} />
                        </Td>
                        <Td>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-slate-900 max-w-[180px] truncate" title={targetDisplay}>
                              {targetDisplay}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 capitalize">
                                {targetModel}
                              </span>
                              {targetId && (
                                <span className="text-[10px] text-slate-400 font-mono truncate max-w-[80px]" title={targetId}>
                                  #{targetId.length > 8 ? targetId.slice(0, 8) + "…" : targetId}
                                </span>
                              )}
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <span className="text-xs text-slate-700 max-w-[120px] truncate block" title={message}>
                            {message}
                          </span>
                        </Td>
                        <Td>
                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-mono text-slate-700">
                            {ip}
                          </span>
                        </Td>
                        <Td>
                          {hasChanges && (
                            <button
                              type="button"
                              onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                              className="grid h-6 w-6 place-items-center rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                              title={isExpanded ? "Hide changes" : "View changes"}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          )}
                        </Td>
                      </tr>
                      {isExpanded && hasChanges && (
                        <tr>
                          <td colSpan={7} className="bg-slate-50/70 px-4 py-3">
                            <ChangesDisplay changes={log.changes} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}

              {!loading && !rows.length && !error && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
                      <Shield className="h-6 w-6 text-slate-400" />
                    </div>
                    <div className="text-sm font-medium text-slate-900">
                      No audit entries found
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {q ? "Try adjusting your search query." : "No activity recorded yet."}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Page {page} · {rows.length} log{rows.length === 1 ? "" : "s"} on page · {total.toLocaleString()} total
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={!hasPrevPage || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 font-medium hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={!hasNextPage || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 font-medium hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
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

function Th({ children, className = "" }) {
  return (
    <th className={`px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 ${className}`}>
      {children}
    </th>
  );
}

function Td({ children }) {
  return <td className="px-3 py-3 align-top text-xs text-slate-800">{children}</td>;
}

function VerbPill({ value }) {
  const v = String(value || "").toUpperCase();
  const map = {
    CREATE: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", label: "Created" },
    UPDATE: { cls: "bg-blue-50 text-blue-700 ring-blue-200", label: "Updated" },
    DELETE: { cls: "bg-rose-50 text-rose-700 ring-rose-200", label: "Deleted" },
    M2M: { cls: "bg-purple-50 text-purple-700 ring-purple-200", label: "Linked" },
    LOGIN: { cls: "bg-cyan-50 text-cyan-700 ring-cyan-200", label: "Login" },
    LOGOUT: { cls: "bg-slate-100 text-slate-700 ring-slate-200", label: "Logout" },
    ACTION: { cls: "bg-amber-50 text-amber-700 ring-amber-200", label: "Action" },
  };
  const { cls, label } = map[v] || { cls: "bg-slate-50 text-slate-700 ring-slate-200", label: v || "—" };
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-medium ring-1 ${cls}`}>
      {label}
    </span>
  );
}

function ChangesDisplay({ changes }) {
  if (!changes || typeof changes !== "object") return null;

  const { before, after, ...rest } = changes;

  // For M2M changes, show related model and PKs
  if (rest.related_model || rest.pks) {
    return (
      <div className="space-y-2">
        <div className="text-[11px] font-medium text-slate-600 uppercase tracking-wide">
          Relationship Changes
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
          {rest.related_model && (
            <div className="mb-1">
              <span className="text-slate-500">Related model:</span>{" "}
              <span className="font-medium text-slate-800 capitalize">{rest.related_model}</span>
            </div>
          )}
          {rest.pks && rest.pks.length > 0 && (
            <div>
              <span className="text-slate-500">IDs ({rest.pks.length}):</span>{" "}
              <span className="font-mono text-slate-700">{rest.pks.slice(0, 10).join(", ")}{rest.pks.length > 10 ? "..." : ""}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // For create/update/delete, show before/after
  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  // Filter out internal/uninteresting fields
  const skipFields = new Set(["id", "created_at", "updated_at", "password", "sha256", "size_bytes"]);
  const displayKeys = [...allKeys].filter((k) => !skipFields.has(k));

  if (displayKeys.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-medium text-slate-600 uppercase tracking-wide">
        Field Changes
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Field</th>
              {before && <th className="px-3 py-2 text-left font-semibold text-rose-600">Before</th>}
              {after && <th className="px-3 py-2 text-left font-semibold text-emerald-600">After</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayKeys.slice(0, 15).map((key) => {
              const beforeVal = before?.[key];
              const afterVal = after?.[key];
              const changed = JSON.stringify(beforeVal) !== JSON.stringify(afterVal);

              return (
                <tr key={key} className={changed ? "bg-amber-50/30" : ""}>
                  <td className="px-3 py-2 font-medium text-slate-700 capitalize">
                    {key.replace(/_/g, " ")}
                  </td>
                  {before && (
                    <td className="px-3 py-2 font-mono text-slate-600 max-w-[200px] truncate" title={String(beforeVal)}>
                      {formatValue(beforeVal)}
                    </td>
                  )}
                  {after && (
                    <td className="px-3 py-2 font-mono text-slate-600 max-w-[200px] truncate" title={String(afterVal)}>
                      {formatValue(afterVal)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {displayKeys.length > 15 && (
          <div className="px-3 py-2 text-[11px] text-slate-500 italic bg-slate-50 border-t border-slate-200">
            + {displayKeys.length - 15} more fields not shown
          </div>
        )}
      </div>
    </div>
  );
}

function formatValue(val) {
  if (val === null || val === undefined) return <span className="text-slate-400">—</span>;
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "object") {
    try {
      const str = JSON.stringify(val);
      return str.length > 50 ? str.slice(0, 50) + "…" : str;
    } catch {
      return "[Object]";
    }
  }
  const str = String(val);
  return str.length > 50 ? str.slice(0, 50) + "…" : str;
}
