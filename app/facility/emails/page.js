
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchEmailOutbox, resendEmailOutbox } from "@/lib/emails";

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
  if (e.status) return e.status;
  if (e.sent_at) return "SENT";
  if (e.error_message || e.error) return "FAILED";
  return "PENDING";
}

export default function FacilityEmailOutboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState(
    searchParams.get("q") || ""
  );
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
          const numericKeys = Object.keys(res).filter((k) =>
            /^\d+$/.test(k)
          );
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
            err?.message ||
              "Failed to load email outbox. Please try again."
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
    const ok = window.confirm(
      "Resend this email via the configured provider?"
    );
    if (!ok) return;

    try {
      setResendingId(id);
      await resendEmailOutbox(id);

      // optimistic: mark status as SENT for UI,
      // backend may still process async but this keeps UX simple.
      setRows((prev) =>
        prev.map((row) =>
          row.id === id || String(row.id) === String(id)
            ? {
                ...row,
                status: "SENT",
                sent_at:
                  row.sent_at || new Date().toISOString(),
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
    <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
            Email outbox
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            See emails sent from this environment: patient notifications,
            appointment reminders, billing alerts, and more.
          </p>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-wrap items-center gap-2"
        >
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
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
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
          </select>

          <button
            type="submit"
            className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            Apply
          </button>
        </form>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                  const status = deriveStatus(e);
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
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            status === "SENT"
                              ? "bg-emerald-50 text-emerald-700"
                              : status === "FAILED"
                              ? "bg-red-50 text-red-700"
                              : status === "PENDING"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-50 text-slate-600"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-800">
                        <span className="line-clamp-2">
                          {e.error_message || e.error || "—"}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-800">
                        <div className="flex flex-wrap gap-2">
                          {status === "FAILED" && (
                            <button
                              type="button"
                              onClick={() => handleResend(e.id)}
                              disabled={resendingId === e.id}
                              className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {resendingId === e.id
                                ? "Resending…"
                                : "Resend"}
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

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-600">
          <span>
            Page {page} · Showing {rows.length} email
            {rows.length === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={!hasPrevPage}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={!hasNextPage}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
