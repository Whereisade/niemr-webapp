// app/facility/audit/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchAuditLogs } from "@/lib/audit";

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

export default function FacilityAuditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState(
    searchParams.get("q") || ""
  );

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
        console.error("Failed to load audit logs", err);
        if (!cancelled) {
          setError(
            err?.message ||
              "Failed to load audit logs. Please try again."
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

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
            Audit logs
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            View a trail of actions taken across this facility: who did
            what, where, and when.
          </p>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="flex w-full max-w-xs items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm"
        >
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filter by user, action, path…"
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
                  User
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Method
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Path
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  IP
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
                    Loading audit logs…
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 text-xs text-slate-800">
                      {formatDateTime(
                        log.timestamp ||
                          log.created_at ||
                          log.request_at
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-800">
                      {log.user_name ||
                        log.user ||
                        log.username ||
                        "—"}
                    </td>
                    <td className="p-3 text-xs text-slate-800">
                      {log.method || log.http_method || "—"}
                    </td>
                    <td className="p-3 text-xs text-slate-800">
                      <span className="font-mono text-[11px]">
                        {log.path ||
                          log.url_path ||
                          log.request_path ||
                          "—"}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-800">
                      {log.status_code ||
                        log.response_status ||
                        "—"}
                    </td>
                    <td className="p-3 text-xs text-slate-800">
                      {log.ip_address ||
                        log.remote_addr ||
                        "—"}
                    </td>
                  </tr>
                ))}

              {!loading && !rows.length && !error && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-4 text-center text-sm text-slate-500"
                  >
                    No audit entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-600">
          <span>
            Page {page} · Showing {rows.length} log
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
