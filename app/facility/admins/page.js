// app/facility/admins/page.js
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
  Shield,
  ShieldCheck,
  UserCog,
  Users2,
  CheckCircle2,
  XCircle,
  Clock,
  MoreVertical,
  Power,
  PowerOff,
} from "lucide-react";


export default function FacilityAdminsPage(props) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <FacilityAdminsPageInner {...props} />
    </Suspense>
  );
}

function StatusBadge({ isActive }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">
      <XCircle className="h-3.5 w-3.5" />
      Inactive
    </span>
  );
}

function RoleBadge({ role }) {
  const config = {
    SUPER_ADMIN: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      ring: "ring-purple-600/20",
      icon: ShieldCheck,
      label: "Super Admin",
    },
    ADMIN: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      ring: "ring-blue-600/20",
      icon: Shield,
      label: "Admin",
    },
    FRONTDESK: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      ring: "ring-amber-600/20",
      icon: UserCog,
      label: "Front Desk",
    },
  };

  const c = config[role] || {
    bg: "bg-slate-50",
    text: "text-slate-600",
    ring: "ring-slate-500/20",
    icon: Users2,
    label: role,
  };
  const Icon = c.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${c.bg} ${c.text} ${c.ring}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {c.label}
    </span>
  );
}

function FacilityAdminsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const [roleFilter, setRoleFilter] = useState(searchParams.get("role") || "");
  const [activeFilter, setActiveFilter] = useState(
    searchParams.get("is_active") || ""
  );

  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  // Load staff
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const qs = new URLSearchParams();
        if (searchParams.get("q")) qs.set("q", searchParams.get("q"));
        if (searchParams.get("role")) qs.set("role", searchParams.get("role"));
        if (searchParams.get("is_active"))
          qs.set("is_active", searchParams.get("is_active"));

        const res = await apiFetch(
          `/accounts/facility-staff/?${qs.toString()}`
        );

        if (cancelled) return;

        const items = Array.isArray(res) ? res : res?.results || [];
        setRows(items);
      } catch (err) {
        console.error("Failed to load staff", err);
        if (!cancelled) {
          setError(err?.message || "Failed to load staff. Please try again.");
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
  }, [searchParams]);

  function applyFilters() {
    const sp = new URLSearchParams();
    if (searchInput.trim()) sp.set("q", searchInput.trim());
    if (roleFilter) sp.set("role", roleFilter);
    if (activeFilter) sp.set("is_active", activeFilter);
    router.push(`/facility/admins?${sp.toString()}`);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    applyFilters();
  }

  async function handleToggleActive(userId, currentlyActive) {
    const action = currentlyActive ? "deactivate" : "reactivate";
    const confirmMsg = currentlyActive
      ? "Are you sure you want to deactivate this staff member? They will no longer be able to log in."
      : "Are you sure you want to reactivate this staff member?";

    if (!window.confirm(confirmMsg)) return;

    try {
      await apiFetch(`/accounts/facility-staff/${userId}/${action}/`, {
        method: "POST",
      });

      // Update local state
      setRows((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_active: !currentlyActive } : u
        )
      );
      setActionMenuOpen(null);
    } catch (err) {
      console.error(`Failed to ${action} staff`, err);
      alert(err?.message || `Failed to ${action} staff member.`);
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-200">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Facility Admins & Staff
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage admin and front desk accounts for your facility.
            </p>
          </div>
        </div>

        <Link
          href="/facility/admins/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-200 transition hover:from-purple-700 hover:to-indigo-700"
        >
          <UserPlus className="h-4 w-4" />
          Add Staff
        </Link>
      </header>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setTimeout(applyFilters, 0);
              }}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-800 shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
            >
              <option value="">All roles</option>
              <option value="ADMIN">Admin</option>
              <option value="FRONTDESK">Front Desk</option>
            </select>
          </div>

          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setTimeout(applyFilters, 0);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
          >
            <option value="">All status</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>

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

      {/* Staff table */}
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
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Joined
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-purple-600" />
                      Loading staff…
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((u) => (
                  <tr key={u.id} className="transition hover:bg-slate-50/60">
                    <td className="px-4 py-3.5 text-sm font-medium text-slate-900">
                      {[u.first_name, u.last_name].filter(Boolean).join(" ") ||
                        "—"}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {u.email}
                    </td>
                    <td className="px-4 py-3.5">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge isActive={u.is_active} />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {u.date_joined
                        ? new Date(u.date_joined).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() =>
                            setActionMenuOpen(
                              actionMenuOpen === u.id ? null : u.id
                            )
                          }
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {actionMenuOpen === u.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActionMenuOpen(null)}
                            />
                            <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                              {u.is_active ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleActive(u.id, true)
                                  }
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                                >
                                  <PowerOff className="h-4 w-4" />
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleActive(u.id, false)
                                  }
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-emerald-600 hover:bg-emerald-50"
                                >
                                  <Power className="h-4 w-4" />
                                  Reactivate
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

              {!loading && !rows.length && !error && (
                <tr>
                  <td colSpan={6} className="p-10 text-center">
                    <div className="mx-auto max-w-sm">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                        <Users2 className="h-7 w-7 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        No staff found
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Get started by adding your first admin or front desk
                        staff.
                      </p>
                      <Link
                        href="/facility/admins/new"
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
                      >
                        <UserPlus className="h-4 w-4" />
                        Add Staff
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
              Showing {rows.length} staff member{rows.length === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </section>

      {/* Info card */}
      <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
            <ShieldCheck className="h-5 w-5 text-purple-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              About Staff Roles
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              <strong>Admins</strong> can manage facility settings, view all
              data, and perform most administrative tasks.{" "}
              <strong>Front Desk</strong> staff can manage appointments,
              check-in patients, and handle basic reception tasks. Only{" "}
              <strong>Super Admins</strong> (like you) can create and manage
              these accounts.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}