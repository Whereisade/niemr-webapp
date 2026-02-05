"use client";

import { useEffect, useState, Suspense } from "react";
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
  Building2,
  CheckCircle2,
  Link2,
} from "lucide-react";
import {
  postAppointmentAction,
  APPT_STATUS,
  TERMINAL_STATUSES,
  getAvailableActions,
} from "@/lib/appointmentsActions";
import { fetchDependents } from "@/lib/dependents";


export default function PatientAppointmentsPage(props) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <PatientAppointmentsPageInner {...props} />
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

function isTerminalStatus(status) {
  const normalized = (status || "").toUpperCase();
  return (TERMINAL_STATUSES || ["COMPLETED", "CANCELLED", "NO_SHOW"]).includes(normalized);
}

function PatientAppointmentsPageInner() {
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

  // For patients: use backend-computed available_actions, fallback to cancel for SCHEDULED
  const getPatientActions = (appt) => {
    // Prefer backend-computed actions
    if (Array.isArray(appt.available_actions)) {
      return appt.available_actions;
    }
    // Fallback: patients can only cancel SCHEDULED appointments
    const statusValue = (appt.status || "").toUpperCase();
    if (statusValue === "SCHEDULED") {
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

  // ───── Dependents lookup for "who is this appointment for" badge ─────
  const [dependents, setDependents] = useState([]);
  const [loadingDependents, setLoadingDependents] = useState(true);
  const [dependentsError, setDependentsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDependents() {
      try {
        setLoadingDependents(true);
        setDependentsError("");

        const res = await fetchDependents();

        if (cancelled) return;

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

        setDependents(items);
      } catch (err) {
        console.error("Failed to load dependents for appointments list", err);
        if (!cancelled) {
          setDependentsError(
            err?.message ||
              "Could not load dependents. Appointments will still show as normal."
          );
          setDependents([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingDependents(false);
        }
      }
    }

    loadDependents();

    return () => {
      cancelled = true;
    };
  }, []);

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
          {dependentsError && (
            <p className="mt-1 text-xs text-amber-600">
              {dependentsError}
            </p>
          )}
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
        {/* Mobile / tablet cards */}
        <div className="md:hidden">
          {isLoading && !data ? (
            <div className="p-6 text-sm text-slate-600">Loading appointments…</div>
          ) : error ? (
            <div className="p-6 text-sm text-rose-700 bg-rose-50">
              Failed to load: {error.message || "Unknown error"}
            </div>
          ) : rows.length ? (
            <div className="divide-y divide-slate-100">
              {rows.map((a) => {
                const statusValue = (a.status || "SCHEDULED").toUpperCase();
                const actions = getPatientActions(a);
                const isFinal = isTerminalStatus(statusValue);

                const patientLabel = a.patient_name || a.patient || "—";
                const isDependent = dependents.some(
                  (dep) => String(dep.id) === String(a.patient)
                );

                const hasEncounter = a.has_encounter || !!a.encounter_id;
                const encounterStatus = a.encounter_status || null;
                const facilityName = a.facility_name || a.facility?.name || "—";

                return (
                  <div key={a.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {patientLabel}
                        </div>
                        {isDependent && (
                          <span className="mt-1 inline-flex w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            Dependent
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <StatusBadge value={a.status} />
                        {isFinal && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <CheckCircle2 className="h-3 w-3" />
                            Final
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-600/10">
                          <Stethoscope className="h-3.5 w-3.5 text-blue-700" />
                        </span>
                        <span className="font-medium text-slate-900">
                          {a.provider_name || a.provider || "—"}
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span>{facilityName}</span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <CalendarRange className="h-4 w-4 text-slate-400" />
                        <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                          {formatDateTime(
                            a.start_at || a.scheduled_for || a.date
                          )}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        Encounter:{" "}
                        {hasEncounter ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <Link2 className="h-3 w-3" />
                            Linked
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                        {encounterStatus ? (
                          <span className="ml-2 text-[11px] text-slate-500">
                            {encounterStatus}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap gap-2">
                        {actions.length > 0 && !isFinal ? (
                          actions.map((action) => (
                            <button
                              key={action}
                              type="button"
                              onClick={() => handleAction(a.id, action)}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {action === "cancel" ? "Cancel" : action}
                            </button>
                          ))
                        ) : isFinal && actions.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">
                            No actions
                          </span>
                        ) : null}
                      </div>
                      <a
                        href={`/patient/appointments/${a.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:border-blue-200 hover:text-blue-700"
                      >
                        View
                        <ChevronRight className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No appointments found"
                subtitle="Try adjusting your search or status filter."
              />
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <Th>Patient</Th>
                <Th>Doctor / Provider</Th>
                <Th>Facility</Th>
                <Th>When</Th>
                <Th>Status</Th>
                <Th>Encounter</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && !data ? (
                <tr>
                  <td colSpan={7} className="p-6 text-slate-600">
                    Loading appointments…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="p-6 text-rose-700 bg-rose-50">
                    Failed to load: {error.message || "Unknown error"}
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((a) => {
                  const statusValue = (a.status || "SCHEDULED").toUpperCase();
                  const actions = getPatientActions(a);
                  const isFinal = isTerminalStatus(statusValue);

                  const patientLabel = a.patient_name || a.patient || "—";
                  const isDependent = dependents.some(
                    (dep) => String(dep.id) === String(a.patient)
                  );

                  // Encounter info from backend
                  const hasEncounter = a.has_encounter || !!a.encounter_id;
                  const encounterStatus = a.encounter_status || null;
                  const facilityName = a.facility_name || a.facility?.name || "—";

                  return (
                    <tr
                      key={a.id}
                      className="transition hover:bg-slate-50/60"
                    >
                      {/* Patient cell with Dependent pill when applicable */}
                      <Td>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900">
                            {patientLabel}
                          </span>
                          {isDependent && (
                            <span className="mt-0.5 inline-flex w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              Dependent
                            </span>
                          )}
                        </div>
                      </Td>

                      {/* Provider */}
                      <Td className="font-medium text-slate-900">
                        <span className="inline-flex items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600/10">
                            <Stethoscope className="h-4 w-4 text-blue-700" />
                          </span>
                          {a.provider_name || a.provider || "—"}
                        </span>
                      </Td>

                      {/* Facility */}
                      <Td>
                        <span className="inline-flex items-center gap-2 text-slate-700">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          {facilityName}
                        </span>
                      </Td>

                      {/* When */}
                      <Td>
                        <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                          {formatDateTime(
                            a.start_at || a.scheduled_for || a.date
                          )}
                        </span>
                      </Td>

                      {/* Status */}
                      <Td>
                        <div className="flex flex-col gap-1">
                          <StatusBadge value={a.status} />
                          {isFinal && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                              <CheckCircle2 className="h-3 w-3" />
                              Final
                            </span>
                          )}
                        </div>
                      </Td>

                      {/* Encounter */}
                      <Td>
                        {hasEncounter ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                              <Link2 className="h-3 w-3" />
                              Linked
                            </span>
                            {encounterStatus && (
                              <span className="text-[11px] text-slate-500">
                                {encounterStatus}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </Td>

                      {/* Actions */}
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* For patients: only Cancel action if available */}
                          {actions.length > 0 && !isFinal && (
                            <div className="inline-flex flex-wrap justify-end gap-1">
                              {actions.map((action) => (
                                <button
                                  key={action}
                                  type="button"
                                  onClick={() => handleAction(a.id, action)}
                                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  {action === "cancel" ? "Cancel" : action}
                                </button>
                              ))}
                            </div>
                          )}

                          {isFinal && actions.length === 0 && (
                            <span className="text-xs text-slate-400 italic">
                              No actions
                            </span>
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
                  <td colSpan={7} className="p-8">
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
