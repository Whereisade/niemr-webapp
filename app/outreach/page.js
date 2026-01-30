"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useOutreachSession } from "@/lib/useOutreachSession";
import OutreachEventPicker from "@/components/outreach/OutreachEventPicker";
import OutreachModuleCards from "@/components/outreach/OutreachModuleCards";
import { CalendarPlus, ListChecks, Shield, ArrowRight } from "lucide-react";

export default function OutreachHomePage() {
  const {
    loading,
    error,
    assignments,
    isOutreachSuperAdmin,
    selectedEventId,
    selectedEvent,
    permissions,
    switchEvent,
  } = useOutreachSession();

  const modulesEnabled = selectedEvent?.modules_enabled || {};

  const stats = useMemo(() => {
    const s = selectedEvent?.stats || {};
    return {
      patients: s.patients ?? selectedEvent?.patients_count ?? null,
      staff: s.staff ?? selectedEvent?.staff_count ?? null,
      sites: s.sites ?? (Array.isArray(selectedEvent?.sites) ? selectedEvent.sites.length : null),
    };
  }, [selectedEvent]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <Shield className="h-3.5 w-3.5" />
            Outreach Workspace
          </div>
          <h1 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Outreach dashboard
          </h1>
          <p className="mt-2 text-slate-600">
            Register patients, capture encounters and generate reports — all tied to a single outreach event.
          </p>
        </div>

        {isOutreachSuperAdmin ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/outreach/events"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <ListChecks className="h-4 w-4" />
              Manage events
            </Link>
            <Link
              href="/outreach/events/new"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <CalendarPlus className="h-4 w-4" />
              New outreach
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <OutreachEventPicker
        loading={loading}
        assignments={assignments}
        isOutreachSuperAdmin={isOutreachSuperAdmin}
        selectedEventId={selectedEventId}
        selectedEvent={selectedEvent}
        onChange={switchEvent}
      />

      {!loading && !selectedEvent && isOutreachSuperAdmin ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Pick an outreach to start</div>
          <p className="mt-1 text-sm text-slate-600">
            Create a new outreach event, or open an existing one from the events page.
          </p>
          <div className="mt-4">
            <Link
              href="/outreach/events"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Go to events <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : null}

      {selectedEvent ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">Patients</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{stats.patients ?? "—"}</div>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">Staff</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{stats.staff ?? "—"}</div>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">Sites</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{stats.sites ?? "—"}</div>
          </div>
        </div>
      ) : null}

      {selectedEvent ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Modules</h2>
            {isOutreachSuperAdmin && selectedEventId ? (
              <Link
                href={`/outreach/events/${selectedEventId}`}
                className="text-sm font-medium text-blue-700 hover:text-blue-800"
              >
                Event settings →
              </Link>
            ) : null}
          </div>
          <OutreachModuleCards
            modulesEnabled={modulesEnabled}
            permissions={permissions}
            isOutreachSuperAdmin={isOutreachSuperAdmin}
          />
        </div>
      ) : null}
    </div>
  );
}
