"use client";

import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAppointments } from "@/lib/useAppointments";
import StatusBadge from "@/components/StatusBadge";
import Paginator from "@/components/Paginator";
import {
  CalendarRange,
  Search,
  Filter,
  UserRound,
  Stethoscope,
  ChevronRight,
} from "lucide-react";
import {
  postAppointmentAction,
  APPT_STATUS,
} from "@/lib/appointmentsActions";

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

export default function PatientAppointmentsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(sp.get("page") || 1);
  const limit = Number(sp.get("limit") || 10);
  const status = sp.get("status") || "";
  const q = sp.get("q") || "";

  // Backend already scopes to the authenticated PATIENT
  const { data, error, isLoading, mutate } = useAppointments({
    page,
    limit,
    status,
    q,
  });

  const rows = Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data)
    ? data
    : [];
  const total = Number(data?.count ?? rows.length);

  const updateQuery = (patch) => {
    const params = new URLSearchParams(sp?.toString() || "");
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") params.delete(k);
      else params.set(k, String(v));
    });
    if ("status" in patch || "q" in patch || "limit" in patch)
      params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  // For patients: only allow Cancel on SCHEDULED
  const getPatientActions = (status) => {
    if (
      status === APPT_STATUS.SCHEDULED ||
      status === "SCHEDULED" ||
      status === "scheduled"
    ) {
      return ["cancel"];
    }
    return [];
  };

  const handleAction = async (apptId, action) => {
    try {
      await postAppointmentAction(apptId, action);
      await mutate();
    } catch (err) {
      console.error("Failed to update appointment", err);
      alert(
        err?.message ||
          "Failed to update appointment status. Please try again."
      );
    }
  };

  return (
    <main className="relative mx-auto max-w-7xl p-6 md:p-10 space-y-6">
      {/* soft bg accents (keeps consistency with provider/facility pages) */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100 blur-3xl opacity-60" />

      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <CalendarRange className="h-3.5 w-3.5" />
            Patient · Appointments
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            My Appointments
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            View, cancel and download details of your bookings.
          </p>
        </div>

        {/* Right side: Book button + mini stats */}
        <div className="flex flex-col items-end gap-2 md:flex-row md:items-center md:gap-3">
          <Link
            href="/patient/appointments/new"
            className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Book appointment
          </Link>

          <div className="inline-flex items-center gap-2">
            <Chip icon={CalendarRange} label="Total" value={total} />
            <Chip icon={UserRound} label="Page" value={page} />
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          {/* search */}
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search reason or notes…"
              defaultValue={q}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                updateQuery({ q: e.currentTarget.value })
              }
              onBlur={(e) => updateQuery({ q: e.currentTarget.value })}
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">Filters</span>
            </div>

            <select
              value={status}
              onChange={(e) => updateQuery({ status: e.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">All statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No-show</option>
            </select>

            <select
              value={String(limit)}
              onChange={(e) => updateQuery({ limit: e.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="10">Show 10</option>
              <option value="20">Show 20</option>
              <option value="50">Show 50</option>
            </select>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <TableHead
          title="My Appointments"
          subtitle={`Showing ${rows.length} of ${total}`}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <Th>Doctor / Provider</Th>
                <Th>When</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && !data ? (
                <tr>
                  <td colSpan={4} className="p-6 text-slate-600">
                    Loading appointments…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="p-6 text-rose-700 bg-rose-50">
                    Failed to load: {error.message || "Unknown error"}
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((a) => {
                  const statusValue = a.status || "SCHEDULED";
                  const actions = getPatientActions(statusValue);

                  return (
                    <tr
                      key={a.id}
                      className="transition hover:bg-slate-50/60"
                    >
                      <Td className="font-medium text-slate-900">
                        <span className="inline-flex items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600/10">
                            <Stethoscope className="h-4 w-4 text-blue-700" />
                          </span>
                          {a.provider_name || a.provider || "—"}
                        </span>
                      </Td>
                      <Td>
                        <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                          {formatDateTime(
                            a.start_at || a.scheduled_for || a.date
                          )}
                        </span>
                      </Td>
                      <Td>
                        <StatusBadge value={a.status} />
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {actions.length > 0 && (
                            <div className="inline-flex flex-wrap justify-end gap-1">
                              {actions.map((action) => (
                                <button
                                  key={action}
                                  type="button"
                                  onClick={() =>
                                    handleAction(a.id, action)
                                  }
                                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  {/* For patients, only "Cancel" appears */}
                                  Cancel
                                </button>
                              ))}
                            </div>
                          )}

                          <a
                            href={`/patient/appointments/${a.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:border-blue-200 hover:text-blue-700"
                          >
                            View
                            <ChevronRight className="h-4 w-4" />
                          </a>
                        </div>
                      </Td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="p-8">
                    <EmptyState
                      title="No appointments found"
                      subtitle="Try adjusting your search or status filter."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer pager */}
        <div className="border-t border-slate-100 px-4 py-3">
          <Paginator page={page} total={total} perPage={limit} />
        </div>
      </section>
    </main>
  );
}

/* ─────────────── UI helpers ─────────────── */

function TableHead({ title, subtitle }) {
  return (
    <div className="flex items-center justify-between p-5 border-b border-slate-200/70">
      <div>
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
            <CalendarRange className="h-5 w-5 text-slate-700" />
          </div>
          <h2 className="text-slate-900 font-medium">{title}</h2>
        </div>
        {subtitle ? (
          <div className="ml-11 text-xs text-slate-500">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th
      className={`px-4 py-3 text-xs font-medium uppercase tracking-wide ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="py-8 text-center">
      <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
        <CalendarRange className="h-6 w-6 text-slate-400" />
      </div>
      <div className="text-sm font-medium text-slate-900">
        {title}
      </div>
      {subtitle ? (
        <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
      ) : null}
    </div>
  );
}

function Chip({ icon: Icon, label, value }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
      {Icon ? <Icon className="h-4 w-4 text-slate-400" /> : null}
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
