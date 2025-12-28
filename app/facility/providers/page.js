// app/facility/providers/page.js
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import {
  UserPlus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  Users2,
  Ban,
  Undo2,
  Trash2,
} from "lucide-react";


export default function FacilityProvidersPage(props) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <FacilityProvidersPageInner {...props} />
    </Suspense>
  );
}

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
  if (p.verification_status) return p.verification_status.toUpperCase();
  return "UNKNOWN";
}

function StatusBadge({ status }) {
  const config = {
    APPROVED: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      ring: "ring-emerald-600/20",
      icon: CheckCircle2,
    },
    PENDING: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      ring: "ring-amber-600/20",
      icon: Clock,
    },
    REJECTED: {
      bg: "bg-red-50",
      text: "text-red-700",
      ring: "ring-red-600/20",
      icon: XCircle,
    },
  };

  const c = config[status] || {
    bg: "bg-slate-50",
    text: "text-slate-600",
    ring: "ring-slate-600/20",
    icon: MoreHorizontal,
  };
  const Icon = c.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${c.bg} ${c.text} ${c.ring}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

function FacilityProvidersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Load current user (for role-based actions)
  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        const data = await apiFetch("/accounts/me/", { method: "GET" });
        if (!cancelled) setMe(data || null);
      } catch {
        if (!cancelled) setMe(null);
      }
    }

    loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [me, setMe] = useState(null);
  const myRole = String(me?.role || "").toUpperCase();
  const canManageProviders = myRole === "ADMIN" || myRole === "SUPER_ADMIN";

  const [searchInput, setSearchInput] = useState(
    searchParams.get("q") || ""
  );
  const [statusFilterInput, setStatusFilterInput] = useState(
    searchParams.get("status") || ""
  );

  // Pending applications state
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(true);

  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "20");
  const q = searchParams.get("q") || "";
  const statusFilter = searchParams.get("status") || "";

  // Load providers (facility-scoped)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const qs = new URLSearchParams(searchParams);
        qs.set("facility", "current");

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
  }, [page, limit, q, statusFilter, searchParams, router]);

  // Load pending provider applications
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
  async function refreshProviders() {
    const qs = new URLSearchParams(searchParams);
    qs.set("facility", "current");

    const res = await apiFetch(`/providers/?${qs.toString()}`);
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
      // Use dedicated approve/reject actions on the backend
      await apiFetch(
        `/providers/${providerId}/${nextStatus.toLowerCase()}/`,
        {
          method: "POST",
        }
      );

      // Optimistic update instead of full reload
      setRows((prev) =>
        prev.map((p) =>
          p.id === providerId || String(p.id) === String(providerId)
            ? {
                ...p,
                status: nextStatus,
                verification_status: nextStatus,
              }
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

  // Approve / reject applications
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
      const qs = new URLSearchParams(searchParams);
      qs.set("facility", "current");

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

  async function handleSuspend(providerId) {
    if (!providerId) return;
    const ok = window.confirm("Suspend this provider? They will be unable to log in.");
    if (!ok) return;

    try {
      await apiFetch(`/providers/${providerId}/suspend/`, { method: "POST" });
      await refreshProviders();
    } catch (err) {
      console.error("Failed to suspend provider", err);
      alert(err?.message || "Failed to suspend provider. Please try again.");
    }
  }

  async function handleUnsuspend(providerId) {
    if (!providerId) return;
    const ok = window.confirm("Re-activate this provider's account?");
    if (!ok) return;

    try {
      await apiFetch(`/providers/${providerId}/unsuspend/`, { method: "POST" });
      await refreshProviders();
    } catch (err) {
      console.error("Failed to unsuspend provider", err);
      alert(err?.message || "Failed to unsuspend provider. Please try again.");
    }
  }

  async function handleRemove(provider) {
    const providerId = provider?.id;
    if (!providerId) return;

    const isFacilityCreated = !!provider?.created_by_facility;
    const ok = window.confirm(
      isFacilityCreated
        ? "Sack this provider? This will PERMANENTLY delete their account created by your facility."
        : "Remove this provider from your facility? (Their account will remain, but they will be detached from this facility.)"
    );
    if (!ok) return;

    try {
      await apiFetch(`/providers/${providerId}/remove-from-facility/`, {
        method: "POST",
      });
      await refreshProviders();
    } catch (err) {
      console.error("Failed to remove provider", err);
      alert(err?.message || "Failed to remove provider. Please try again.");
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200">
            <Users2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Providers &amp; Staff
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage doctors, nurses, and other providers associated with
              this facility.
            </p>
          </div>
        </div>

        <Link
          href="/facility/providers/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:from-blue-700 hover:to-indigo-700"
        >
          <UserPlus className="h-4 w-4" />
          Add Provider
        </Link>
      </header>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-1 flex-wrap items-center gap-2"
        >
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={statusFilterInput}
              onChange={handleStatusFilterChange}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Existing providers table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Facility
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-sm text-slate-500"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                      Loading providers…
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((p) => {
                  const status = deriveStatus(p);

                  return (
                    <tr key={p.id} className="transition hover:bg-slate-50/60">
                      <td className="px-4 py-3.5 text-sm font-medium text-slate-900">
                        {formatName(p)}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        {p.email || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        {formatRoles(p)}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        {formatFacility(p)}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-4 py-3.5">
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
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
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
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Reject
                              </button>
                            </>
                          )}
                        
                          {canManageProviders && (
                            <>
                              {p.is_active ? (
                                <button
                                  type="button"
                                  onClick={() => handleSuspend(p.id)}
                                  className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
                                  title="Suspend provider account"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  Suspend
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleUnsuspend(p.id)}
                                  className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                                  title="Re-activate provider account"
                                >
                                  <Undo2 className="h-3.5 w-3.5" />
                                  Unsuspend
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemove(p)}
                                className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                                title={
                                  p.created_by_facility
                                    ? "Sack (delete) provider account"
                                    : "Remove provider from facility"
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {p.created_by_facility ? "Sack" : "Remove"}
                              </button>
                            </>
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
                    className="p-10 text-center"
                  >
                    <div className="mx-auto max-w-sm">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                        <Users2 className="h-7 w-7 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        No providers found
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Get started by adding your first provider to this
                        facility.
                      </p>
                      <Link
                        href="/facility/providers/new"
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                      >
                        <UserPlus className="h-4 w-4" />
                        Add Provider
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <span className="text-sm text-slate-600">
              Page {page} · Showing {rows.length} provider
              {rows.length === 1 ? "" : "s"}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={!hasPrevPage}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={!hasNextPage}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Pending provider applications */}
      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Pending Applications
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            These providers have requested to join your facility. Approving will
            attach them to this facility and mark their profile as approved.
          </p>
        </div>

        {loadingApplications ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
              Loading applications…
            </div>
          </div>
        ) : applications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <Clock className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              No pending applications
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Provider applications will appear here when submitted.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Provider
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Facility
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Message
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app.id} className="transition hover:bg-slate-50/60">
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      {app.provider_name}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {app.facility_name}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">
                      {app.message ? (
                        app.message
                      ) : (
                        <span className="italic text-slate-400">
                          No message
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleApplicationDecision(app.id, "approve")
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleApplicationDecision(app.id, "reject")
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700"
                        >
                          <XCircle className="h-3.5 w-3.5" />
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