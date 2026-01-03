// app/facility/emails/page.js
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchEmailOutbox, resendEmailOutbox } from "@/lib/emails";
import {
  Mailbox,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  Mail,
} from "lucide-react";


export default function FacilityEmailOutboxPage(props) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <FacilityEmailOutboxPageInner {...props} />
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

function deriveStatus(e) {
  const raw = (e?.status || "").toString().trim();
  if (raw) return raw.toUpperCase();

  // Fallbacks if backend didn’t include status for some reason
  if (e?.delivered_at) return "DELIVERED";
  if (e?.sent_at) return "SENT";
  if (e?.last_error || e?.error_message || e?.error) return "FAILED";
  return "QUEUED";
}

function FacilityEmailOutboxPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const [statusFilterInput, setStatusFilterInput] = useState(
    searchParams.get("status") || ""
  );
  const [resendingId, setResendingId] = useState(null);

  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "20");
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || "";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetchEmailOutbox({
          page,
          limit,
          q,
          status,
        });

        if (cancelled) return;

        setData(res);

        let items = [];
        if (Array.isArray(res?.results)) {
          items = res.results;
        } else if (Array.isArray(res)) {
          items = res;
        } else if (res && typeof res === "object") {
          const numericKeys = Object.keys(res).filter((k) => /^\d+$/.test(k));
          if (numericKeys.length) {
            items = numericKeys
              .sort((a, b) => Number(a) - Number(b))
              .map((k) => res[k]);
          }
        }

        setRows(items);
      } catch (err) {
        console.error("Failed to load email outbox", err);
        if (!cancelled) {
          setError(
            err?.message || "Failed to load email outbox. Please try again."
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
  }, [page, limit, q, status]);

  const hasNextPage = rows.length === limit;
  const hasPrevPage = page > 1;
  const total = Number(data?.count ?? rows.length);

  const failedCount = rows.filter((e) => {
    const s = deriveStatus(e).toUpperCase();
    return s === "FAILED" || s === "BOUNCED";
  }).length;
  const pendingCount = rows.filter((e) => {
    const s = deriveStatus(e).toUpperCase();
    return s === "QUEUED" || s === "SENDING";
  }).length;

  function goToPage(nextPage) {
    const sp = new URLSearchParams(searchParams.toString());
    if (nextPage && nextPage > 1) {
      sp.set("page", String(nextPage));
    } else {
      sp.delete("page");
    }
    router.push(`/facility/emails?${sp.toString()}`);
  }

  function applyFilters(nextQ, nextStatus) {
    const sp = new URLSearchParams(searchParams.toString());
    if (nextQ) {
      sp.set("q", nextQ);
    } else {
      sp.delete("q");
    }
    if (nextStatus) {
      sp.set("status", nextStatus);
    } else {
      sp.delete("status");
    }
    sp.delete("page");
    router.push(`/facility/emails?${sp.toString()}`);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    applyFilters(searchInput.trim(), statusFilterInput);
  }

  function handleStatusFilterChange(e) {
    const value = e.target.value;
    setStatusFilterInput(value);
    applyFilters(searchInput.trim(), value);
  }

  async function handleResend(id) {
    if (!id) return;
    const ok = window.confirm("Resend this email via the configured provider?");
    if (!ok) return;

    try {
      setResendingId(id);
      await resendEmailOutbox(id);

      // optimistic: mark status as SENT for UI
      setRows((prev) =>
        prev.map((row) =>
          row.id === id || String(row.id) === String(id)
            ? {
                ...row,
                status: "SENT",
                sent_at: row.sent_at || new Date().toISOString(),
                error_message: null,
              }
            : row
        )
      );
    } catch (err) {
      console.error("Resend email failed", err);
      alert(
        err?.message ||
          "Failed to trigger resend. Please check the error logs."
      );
    } finally {
      setResendingId(null);
    }
  }

  return (
    <main className="relative mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      {/* subtle background blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-52 w-52 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-52 w-52 rounded-full bg-emerald-100/50 blur-3xl" />

      {/* Header */}
      <header className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <Mailbox className="h-3.5 w-3.5" />
            Facility email outbox
          </div>

          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
              Email outbox
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              See emails sent from this environment: patient notifications,
              appointment reminders, billing alerts, and more.
            </p>
          </div>

          {/* Quick stats */}
          <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-700 shadow-sm">
              <Mail className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-medium">
                Total on page: <span className="font-semibold">{rows.length}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800 shadow-sm">
              <Clock className="h-3.5 w-3.5" />
              Pending: <span className="font-semibold">{pendingCount}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] text-red-800 shadow-sm">
              <AlertTriangle className="h-3.5 w-3.5" />
              Failed: <span className="font-semibold">{failedCount}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex w-full max-w-md flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-sm md:flex-row md:items-center"
        >
          <div className="flex flex-1 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by recipient or subject…"
              className="flex-1 border-none bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <select
            value={statusFilterInput}
            onChange={handleStatusFilterChange}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="QUEUED">Queued</option>
            <option value="SENDING">Sending</option>
            <option value="SENT">Sent</option>
            <option value="DELIVERED">Delivered</option>
            <option value="BOUNCED">Bounced</option>
            <option value="FAILED">Failed</option>
          </select>

          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Apply
          </button>
        </form>
      </header>

      {error && (
        <div className="relative rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Accent bar */}
        <div className="-mx-px -mt-px mb-3 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  When
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  To
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Subject
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Error
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-4 text-center text-sm text-slate-500"
                  >
                    Loading emails…
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((e) => {
                  const statusValue = deriveStatus(e);
                  const toAddress =
                    e.to_email ||
                    e.to ||
                    e.recipient ||
                    (Array.isArray(e.to_emails)
                      ? e.to_emails.join(", ")
                      : "—");

                  return (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="p-3 text-xs text-slate-800">
                        {formatDateTime(
                          e.sent_at || e.created_at || e.timestamp
                        )}
                      </td>
                      <td className="p-3 text-xs text-slate-800">
                        {toAddress}
                      </td>
                      <td className="p-3 text-xs text-slate-800">
                        {e.subject || e.title || "—"}
                      </td>
                      <td className="p-3 text-xs text-slate-800">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            statusValue === "DELIVERED"
                              ? "bg-emerald-50 text-emerald-700"
                              : statusValue === "SENT"
                              ? "bg-blue-50 text-blue-700"
                              : statusValue === "FAILED" || statusValue === "BOUNCED"
                              ? "bg-red-50 text-red-700"
                              : statusValue === "QUEUED" || statusValue === "SENDING"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-50 text-slate-600"
                          }`}
                        >
                          {statusValue === "DELIVERED" && (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          {statusValue === "SENT" && (
                            <Mail className="h-3 w-3" />
                          )}
                          {(statusValue === "FAILED" || statusValue === "BOUNCED") && (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {(statusValue === "QUEUED" || statusValue === "SENDING") && (
                            <Clock className="h-3 w-3" />
                          )}
                          {statusValue}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-800">
                        <span className="line-clamp-2">
                          {e.last_error || e.error_message || e.error || "—"}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-800">
                        <div className="flex flex-wrap gap-2">
                          {(statusValue === "FAILED" || statusValue === "BOUNCED") && (
                            <button
                              type="button"
                              onClick={() => handleResend(e.id)}
                              disabled={resendingId === e.id}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              <RefreshCw className="h-3 w-3" />
                              {resendingId === e.id ? "Resending…" : "Resend"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {!loading && !rows.length && !error && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-4 text-center text-sm text-slate-500"
                  >
                    No emails found in the outbox.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pager */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-600">
          <span>
            Page {page} · Showing {rows.length} of {total || rows.length} email
            {rows.length === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={!hasPrevPage}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={!hasNextPage}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-medium hover:bg-slate-50 disabled:opacity-50"
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
