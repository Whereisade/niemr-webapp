"use client";

import { Suspense, useEffect, useState } from "react";

import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAppointments } from "@/lib/useAppointments";
import StartEncounterButton from "@/components/encounters/StartEncounterButton";
import { apiFetch } from "@/lib/api";
import {
  postAppointmentAction,
  getAvailableActions,
  APPT_ACTION_LABELS,
  canStartEncounter,
  TERMINAL_STATUSES,
  getStatusBadgeInfo,
} from "@/lib/appointmentsActions";
import {
  CalendarRange,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  UserRound,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Building2,
} from "lucide-react";


export default function ProviderAppointmentsPage(props) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <ProviderAppointmentsPageInner {...props} />
    </Suspense>
  );
}

function ProviderAppointmentsPageInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const page = Number(sp.get("page") || 1);
  const limit = Number(sp.get("limit") || 10);
  const status = sp.get("status") || "";
  const date = sp.get("date") || "today";
  const q = sp.get("q") || "";

  const { data, error, isLoading, mutate } = useAppointments({
    page,
    limit,
    status,
    date,
    q,
    mine: "true",
  });

  useEffect(() => {
    let cancelled = false;
    
    async function fetchMe() {
      try {
        setLoadingMe(true);
        const meData = await apiFetch("/accounts/me/");
        if (!cancelled) {
          setMe(meData);
        }
      } catch (err) {
        console.error("Failed to load user", err);
      } finally {
        if (!cancelled) setLoadingMe(false);
      }
    }

    fetchMe();
    
    return () => {
      cancelled = true;
    };
  }, []);

  const rowsRaw = data?.results ?? (Array.isArray(data) ? data : []);
  const rows = Array.isArray(rowsRaw) ? rowsRaw : [];
  const total = Number(data?.count ?? rows.length);

  const updateQuery = (patch) => {
    const params = new URLSearchParams(sp?.toString() || "");
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") params.delete(k);
      else params.set(k, String(v));
    });
    if ("q" in patch || "status" in patch || "limit" in patch || "date" in patch) {
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

  const dateLabelMap = {
    today: "Today",
    tomorrow: "Tomorrow",
    this_week: "This week",
    next_7d: "Next 7 days",
    all: "All dates",
  };
  const dateLabel = dateLabelMap[date] || "Custom";

  const hasActiveFilters = Boolean(status || q || date !== "today");

  // Check if user has facility (to show/hide facility column)
  const userHasFacility = Boolean(me?.facility);

  return (
    <main className="relative mx-auto max-w-7xl p-6 md:p-10 space-y-6">
      {/* soft background accents for design parity */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100 blur-3xl opacity-60" />

      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            Provider · My Schedule
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Appointments
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Filter, search, and manage visits across{" "}
            <span className="font-medium">{dateLabel.toLowerCase()}</span>.
          </p>
        </div>

        {/* Quick summary chips + primary action */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/provider/appointments/new"
            className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            New appointment
          </Link>
          <StatChip label="Total" value={total} />
          <StatChip label="Page" value={page} />
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </header>

      {/* Filters toolbar */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          {/* left: search */}
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              defaultValue={q}
              onKeyDown={(e) => {
                if (e.key === "Enter") updateQuery({ q: e.currentTarget.value });
              }}
              onBlur={(e) => updateQuery({ q: e.currentTarget.value })}
              placeholder="Search patient / reason…"
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            {q ? (
              <div className="mt-1 text-xs text-slate-400">
                Press{" "}
                <span className="rounded border border-slate-200 px-1">
                  Enter
                </span>{" "}
                to apply search
              </div>
            ) : null}
          </div>

          {/* right: selects + quick date */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                hasActiveFilters
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filters {hasActiveFilters ? "· Active" : ""}</span>
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
              value={date}
              onChange={(e) => updateQuery({ date: e.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="this_week">This week</option>
              <option value="next_7d">Next 7 days</option>
              <option value="all">All dates</option>
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
          title="My Appointments"
          subtitle={`${dateLabel} · ${total} total`}
        />
        {isLoading || loadingMe ? (
          <div className="p-6 text-sm text-slate-600">
            Loading appointments…
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-700 bg-rose-50 border-t border-rose-100">
            Failed to load: {String(error?.message || error)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <Th>Patient</Th>
                  {userHasFacility && <Th>Facility</Th>}
                  <Th>Reason</Th>
                  <Th>Time</Th>
                  <Th>Status</Th>
                  <Th>Encounter</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length ? (
                  rows.map((a) => {
                    const time =
                      a.scheduled_for || a.start_time || a.date || a.time || "—";
                    const apptStatus = (a.status || "SCHEDULED").toUpperCase();
                    const isTerminal = TERMINAL_STATUSES.includes(apptStatus);

                    // Use backend-computed values if available
                    const showStartEncounter =
                      typeof a.can_start_encounter === "boolean"
                        ? a.can_start_encounter
                        : canStartEncounter(a);

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
                        <Td>
                          <div className="flex items-center gap-2">
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600/10">
                              <UserRound className="h-4 w-4 text-blue-700" />
                            </span>
                            <div>
                              <div className="font-medium text-slate-900">
                                {a.patient_name || a.patient || "—"}
                              </div>
                            </div>
                          </div>
                        </Td>
                        {userHasFacility && (
                          <Td>
                            {a.facility_name ? (
                              <div className="flex items-center gap-1 text-xs text-slate-600">
                                <Building2 className="h-3 w-3 text-slate-400" />
                                {a.facility_name}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </Td>
                        )}
                        <Td className="text-slate-600">
                          <span className="line-clamp-2">
                            {a.reason || "Consultation"}
                          </span>
                        </Td>
                        <Td>
                          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                            <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
                            {time}
                          </span>
                        </Td>
                        <Td>
                          <StatusPill value={apptStatus} />
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
                            <span className="text-xs text-slate-400">
                              No encounter
                            </span>
                          )}
                        </Td>
                        <Td className="text-right">
                          <div className="flex flex-col items-end gap-2">
                            {/* Start Encounter button - only show if allowed */}
                            {showStartEncounter && (
                              <StartEncounterButton
                                scope="provider"
                                appointment={a}
                                onSuccess={() => mutate()}
                              />
                            )}

                            {/* Action buttons */}
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
                            {isTerminal && actions.length === 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                                <AlertCircle className="h-3 w-3" />
                                Final
                              </span>
                            )}

                            <a
                              href={`/provider/appointments/${a.id}`}
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
                    <td colSpan={userHasFacility ? 7 : 6}>
                      <EmptyState
                        title="No appointments"
                        subtitle="When you're booked, visits will appear here automatically."
                        icon={CalendarRange}
                        ctaHref="/provider/appointments/new"
                        ctaLabel="Create appointment"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pager */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          <div>
            Page {page} · {total} total
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => updateQuery({ page: page - 1 })}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 shadow-sm hover:border-slate-300 disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              disabled={!rows.length || rows.length < limit}
              onClick={() => updateQuery({ page: page + 1 })}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 shadow-sm hover:border-slate-300 disabled:opacity-50"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ─────────────── UI helpers ─────────────── */

function CardHead({ title, subtitle }) {
  return (
    <div className="flex items-center justify-between p-5 border-b border-slate-200/70">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
          <CalendarRange className="h-5 w-5 text-slate-700" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-900">{title}</h2>
          {subtitle ? (
            <p className="text-xs text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="hidden text-xs text-slate-500 md:block">
        Most recent first
      </div>
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return (
    <td className={`px-4 py-3 align-middle text-sm text-slate-800 ${className}`}>
      {children}
    </td>
  );
}

function EmptyState({ icon: Icon, title, subtitle, ctaHref, ctaLabel }) {
  return (
    <div className="py-10 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <div className="text-sm font-medium text-slate-900">{title}</div>
      {subtitle ? (
        <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
      ) : null}
      {ctaHref && ctaLabel ? (
        <div className="mt-4">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50"
          >
            {ctaLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ value }) {
  const info = getStatusBadgeInfo(value);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs ring-1 ${info.colorClass}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {info.label}
    </span>
  );
}

function StatChip({ label, value }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}