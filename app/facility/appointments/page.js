"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAppointments } from "@/lib/useAppointments";
import { apiFetch } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import Paginator from "@/components/Paginator";
import StartEncounterButton from "@/components/encounters/StartEncounterButton";
import {
  CalendarRange,
  Search,
  Filter,
  RefreshCw,
  Users2,
  Stethoscope,
  UserRound,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import {
  postAppointmentAction,
  getAvailableActions,
  APPT_ACTION_LABELS,
  canStartEncounter,
  TERMINAL_STATUSES,
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

function statusRank(status) {
  const s = String(status || "").toUpperCase();
  // "New/current" should be first/top
  if (s === "CHECKED_IN") return 0;
  if (s === "SCHEDULED") return 1;
  if (s === "COMPLETED") return 2;
  if (s === "CANCELLED") return 3;
  if (s === "NO_SHOW") return 4;
  return 99;
}

function safeTime(value) {
  const t = Date.parse(value || "");
  return Number.isNaN(t) ? 0 : t;
}

function encounterWorkflowHref(encounterId, stage) {
  const id = String(encounterId || "").trim();
  if (!id) return null;

  const s = String(stage || "").toUpperCase();
  if (s === "PRESCRIPTION") return `/facility/encounters/${id}/workflow/prescription`;
  if (s === "WAITING_LABS") return `/facility/encounters/${id}/workflow/waiting-labs`;
  if (s === "NOTE") return `/facility/encounters/${id}/workflow/clinical`;
  if (s === "LABS") return `/facility/encounters/${id}/workflow/labs`;

  // Fallback
  return `/facility/encounters/${id}`;
}

export default function FacilityAppointmentsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(sp.get("page") || 1);
  const limit = Number(sp.get("limit") || 10);
  const status = sp.get("status") || "";
  const q = sp.get("q") || "";

  const [me, setMe] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/accounts/me/", { method: "GET" })
      .then((data) => {
        if (!cancelled) setMe(data || null);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const role = String(me?.role || "").toUpperCase();
  const isDoctor = role === "DOCTOR";

  // Facility logins auto-scope by user.facility_id on the backend
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

  // Ensure new/current are first/top (even if backend pagination/order changes)
  const sortedRows = rows
    .slice()
    .sort((a, b) => {
      const r = statusRank(a.status) - statusRank(b.status);
      if (r !== 0) return r;
      const t = safeTime(a.start_at) - safeTime(b.start_at);
      if (t !== 0) return t;
      return Number(a.id || 0) - Number(b.id || 0);
    });

  const updateQuery = (patch) => {
    const params = new URLSearchParams(sp?.toString() || "");
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") params.delete(k);
      else params.set(k, String(v));
    });
    if ("status" in patch || "q" in patch || "limit" in patch) {
      params.set("page", "1");
    }
    router.push(`${pathname}?${params.toString()}`);
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
      {/* soft bg accents to match the rest of the app */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100 blur-3xl opacity-60" />

      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <CalendarRange className="h-3.5 w-3.5" />
            Facility · Appointments
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Facility Appointments
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            All appointments scheduled for you in this facility.
          </p>
        </div>

        {/* quick stats + primary action */}
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Link
            href="/facility/appointments/new"
            className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            New appointment
          </Link>
          <Chip icon={CalendarRange} label="Total" value={total} />
          <Chip icon={Users2} label="Page" value={page} />
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-blue-200 hover:text-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
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
              placeholder="Search patient / reason / notes…"
              defaultValue={q}
              onKeyDown={(e) =>
                e.key === "Enter" && updateQuery({ q: e.currentTarget.value })
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

      {/* Table card */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardHead
          title="All Appointments"
          subtitle={`Showing ${sortedRows.length} of ${total}`}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <Th>Patient</Th>
                <Th>Provider</Th>
                <Th>Nurse</Th>
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
              ) : sortedRows.length ? (
                sortedRows.map((a) => {
                  const apptStatus = (a.status || "SCHEDULED").toUpperCase();
                  const isTerminal = TERMINAL_STATUSES.includes(apptStatus);

                  const encStatus = String(a.encounter_status || "").toUpperCase();
                  const hasOpenEncounter = Boolean(
                    a.encounter_id && !["CLOSED", "CROSSED_OUT"].includes(encStatus)
                  );
                  const continueHref = hasOpenEncounter
                    ? encounterWorkflowHref(a.encounter_id, a.encounter_stage)
                    : null;

                  // Use backend-computed values if available, otherwise calculate
                  const showStartEncounter =
                    typeof a.can_start_encounter === "boolean"
                      ? a.can_start_encounter
                      : canStartEncounter(a);

                  // Get available actions - use backend computed if available
                  const actions = Array.isArray(a.available_actions)
                    ? a.available_actions
                    : getAvailableActions(apptStatus, {
                        hasEncounter: a.has_encounter || !!a.encounter_id,
                        encounterStatus: a.encounter_status,
                      });

                  return (
                    <tr
                      key={a.id}
                      className={`transition hover:bg-slate-50/60 ${
                        isTerminal ? "opacity-60" : ""
                      }`}
                    >
                      <Td className="font-medium text-slate-900">
                        <span className="inline-flex items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600/10">
                            <Users2 className="h-4 w-4 text-blue-700" />
                          </span>
                          {a.patient_name || a.patient || "—"}
                        </span>
                      </Td>

                      <Td className="text-slate-700">
                        <span className="inline-flex items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100">
                            <Stethoscope className="h-4 w-4 text-slate-700" />
                          </span>
                          {a.provider_name || a.provider || "—"}
                        </span>
                      </Td>

                      <Td className="text-slate-700">
                        <span className="inline-flex items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100">
                            <UserRound className="h-4 w-4 text-slate-700" />
                          </span>
                          {a.nurse_name || "—"}
                        </span>
                      </Td>

                      <Td>
                        <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                          {formatDateTime(a.start_at || a.scheduled_for || a.date)}
                        </span>
                      </Td>

                      <Td>
                        <StatusBadge value={a.status} />
                      </Td>

                      <Td>
                        {a.encounter_id || a.has_encounter ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              Linked #{a.encounter_id}
                            </span>
                            {a.encounter_status && (
                              <span className="text-xs text-slate-500">
                                {a.encounter_status}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No encounter</span>
                        )}
                      </Td>

                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Only show Start Encounter if appointment allows it */}
                          {showStartEncounter && (
                            <StartEncounterButton scope="facility" appointment={a} />
                          )}

                          {/* Doctors: continue assigned encounter (disappears after encounter is closed) */}
                          {isDoctor && continueHref ? (
                            <Link
                              href={continueHref}
                              className="inline-flex w-[90px] items-center gap-1 rounded-[15px] bg-blue-600 pr-4.5 py-1 text-[11px] font-medium text-white hover:bg-blue-700 shadow-sm"
                            >
                              Continue Encounter
                            </Link>
                          ) : null}

                          {/* Show actions only if there are any */}
                          {actions.length > 0 && (
                            <div className="inline-flex flex-wrap justify-end gap-1">
                              {actions.map((action) => (
                                <button
                                  key={action}
                                  type="button"
                                  onClick={() => handleAction(a.id, action)}
                                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  {APPT_ACTION_LABELS[action] || action}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Terminal status indicator */}
                          {isTerminal && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                              <AlertCircle className="h-3 w-3" />
                              Final
                            </span>
                          )}

                          <a
                            href={`/facility/appointments/${a.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:border-blue-200 hover:text-blue-700"
                          >
                            Open
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
                      subtitle="Try adjusting your search or status filters."
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

function CardHead({ title, subtitle }) {
  return (
    <div className="flex items-center justify-between p-5 border-b border-slate-200/70">
      <div>
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
            <CalendarRange className="h-5 w-5 text-slate-700" />
          </div>
          <h2 className="text-slate-900 font-medium">{title}</h2>
        </div>
        {subtitle ? <div className="ml-11 text-xs text-slate-500">{subtitle}</div> : null}
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
      <div className="text-sm font-medium text-slate-900">{title}</div>
      {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
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
