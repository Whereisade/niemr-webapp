// app/facility/providers/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

function formatName(p) {
  const first = (p.first_name || "").trim();
  const last = (p.last_name || "").trim();
  const full = [first, last].filter(Boolean).join(" ");
  return full || p.name || p.email || "—";
}

function formatRoles(p) {
  if (Array.isArray(p.roles) && p.roles.length) {
    return p.roles.join(", ");
  }
  return p.role || p.user_role || "—";
}

function formatFacility(p) {
  if (p.facility && typeof p.facility === "object") {
    return p.facility.name || p.facility.code || "—";
  }
  return p.facility_name || "—";
}

function deriveStatus(p) {
  if (p.status) return p.status;
  if (typeof p.is_approved === "boolean") {
    return p.is_approved ? "APPROVED" : "PENDING";
  }
  return "UNKNOWN";
}

export default function FacilityProvidersPage() {
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

  // NEW: pending applications state
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(true);

  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "20");
  const q = searchParams.get("q") || "";
  const statusFilter = searchParams.get("status") || "";

  // Load providers
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const qs = new URLSearchParams();
        qs.set("page", String(page));
        qs.set("limit", String(limit));
        if (q) qs.set("q", q);
        if (statusFilter) qs.set("status", statusFilter);

        const res = await apiFetch(`/providers/?${qs.toString()}`);

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
        console.error("Failed to load providers", err);
        if (!cancelled) {
          setError(
            err?.message ||
              "Failed to load providers. Please try again."
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
  }, [page, limit, q, statusFilter]);

  // NEW: load pending provider applications
  async function loadApplications() {
    try {
      setLoadingApplications(true);
      const body = await apiFetch(
        "/providers/facility/applications/?status=PENDING"
      );
      const items = body.results || body || [];
      setApplications(items);
    } catch (err) {
      console.error("Failed to load provider applications", err);
    } finally {
      setLoadingApplications(false);
    }
  }

  // Call once on mount (and whenever you want to re-sync, if deps added later)
  useEffect(() => {
    loadApplications();
  }, []);

  const hasNextPage = rows.length === limit;
  const hasPrevPage = page > 1;

  function goToPage(nextPage) {
    const sp = new URLSearchParams(searchParams.toString());
    if (nextPage && nextPage > 1) {
      sp.set("page", String(nextPage));
    } else {
      sp.delete("page");
    }
    router.push(`/facility/providers?${sp.toString()}`);
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

    // reset to first page
    sp.delete("page");
    router.push(`/facility/providers?${sp.toString()}`);
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

  async function handleStatusChange(providerId, nextStatus) {
    if (!providerId || !nextStatus) return;

    if (nextStatus === "REJECTED") {
      const ok = window.confirm(
        "Are you sure you want to reject this provider?"
      );
      if (!ok) return;
    }

    try {
      await apiFetch(`/providers/${providerId}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });

      // Optimistic update instead of full reload
      setRows((prev) =>
        prev.map((p) =>
          p.id === providerId || String(p.id) === String(providerId)
            ? { ...p, status: nextStatus }
            : p
        )
      );
    } catch (err) {
      console.error("Failed to update provider status", err);
      alert(
        err?.message ||
          "Failed to update provider status. Please try again."
      );
    }
  }

  // NEW: approve / reject applications
  async function handleApplicationDecision(applicationId, decision) {
    try {
      await apiFetch(
        `/providers/facility/applications/${applicationId}/${decision}/`,
        {
          method: "POST",
        }
      );
      // After decision, refresh both providers + pending applications
      // so newly approved providers show in the list and app disappears
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("limit", String(limit));
      if (q) qs.set("q", q);
      if (statusFilter) qs.set("status", statusFilter);

      // Reload providers list
      try {
        const res = await apiFetch(`/providers/?${qs.toString()}`);
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
        console.error("Failed to reload providers after decision", err);
      }

      // Reload applications
      await loadApplications();
    } catch (err) {
      console.error("Failed to update application", err);
      alert(
        err?.message ||
          "Failed to update application. Please try again."
      );
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
            Providers &amp; staff
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage doctors, nurses, and other providers associated with
            this facility. Approve or reject new provider accounts.
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
              placeholder="Search by name or email…"
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
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
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

      {/* Existing providers table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Name
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Role
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Facility
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
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
                    Loading providers…
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((p) => {
                  const status = deriveStatus(p);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3 text-sm text-slate-800">
                        {formatName(p)}
                      </td>
                      <td className="p-3 text-sm text-slate-800">
                        {p.email || "—"}
                      </td>
                      <td className="p-3 text-sm text-slate-800">
                        {formatRoles(p)}
                      </td>
                      <td className="p-3 text-sm text-slate-800">
                        {formatFacility(p)}
                      </td>
                      <td className="p-3 text-xs font-medium text-slate-800">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 ${
                            status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700"
                              : status === "PENDING"
                              ? "bg-amber-50 text-amber-700"
                              : status === "REJECTED"
                              ? "bg-red-50 text-red-700"
                              : "bg-slate-50 text-slate-600"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-slate-800">
                        <div className="flex flex-wrap gap-2">
                          {status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleStatusChange(
                                    p.id,
                                    "APPROVED"
                                  )
                                }
                                className="rounded-full border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleStatusChange(
                                    p.id,
                                    "REJECTED"
                                  )
                                }
                                className="rounded-full border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {/* example placeholder for a future detail page */}
                          {/* <Link
                            href={`/facility/providers/${p.id}`}
                            className="rounded-full border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </Link> */}
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
                    No providers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-600">
          <span>
            Page {page} · Showing {rows.length} provider
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

      {/* NEW: Pending provider applications */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold text-slate-800">
          Pending provider applications
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          These providers have requested to join your facility. Approving will
          attach them to this facility and mark their profile as approved.
        </p>

        {loadingApplications ? (
          <p className="mt-3 text-xs text-slate-500">
            Loading applications…
          </p>
        ) : applications.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">
            No pending applications.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">
                    Provider
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">
                    Facility
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">
                    Message
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td className="px-4 py-2 text-slate-800">
                      {app.provider_name}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {app.facility_name}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {app.message ? (
                        app.message
                      ) : (
                        <span className="italic text-slate-400">
                          No message
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleApplicationDecision(app.id, "approve")
                          }
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleApplicationDecision(app.id, "reject")
                          }
                          className="rounded-lg bg-red-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
