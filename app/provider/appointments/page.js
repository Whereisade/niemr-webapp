"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAppointments } from "@/lib/useAppointments";
import {
  CalendarRange,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  UserRound,
} from "lucide-react";

/**
 * Provider list pulls your own (“mine”) appointments.
 * You’ll see /api/proxy/appointments/?mine=true... in DevTools and Django logs.
 */
export default function ProviderAppointmentsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page   = Number(sp.get("page") || 1);
  const limit  = Number(sp.get("limit") || 10);
  const status = sp.get("status") || "";
  const date   = sp.get("date")   || "today";
  const q      = sp.get("q")      || "";

  const { data, error, isLoading } = useAppointments({
    page, limit, status, date, q, mine: "true",
  });

  const rowsRaw = data?.results ?? (Array.isArray(data) ? data : []);
  const rows = Array.isArray(rowsRaw) ? rowsRaw : [];
  const total = Number(data?.count ?? rows.length);

  const updateQuery = (patch) => {
    const params = new URLSearchParams(sp?.toString() || "");
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "" ) params.delete(k);
      else params.set(k, String(v));
    });
    // reset page when changing filters/search/limit/date/status
    if ("q" in patch || "status" in patch || "limit" in patch || "date" in patch) {
      params.set("page", "1");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <main className="relative mx-auto max-w-7xl p-6 md:p-10 space-y-6">
      {/* soft background accents for design parity */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100 blur-3xl opacity-60" />

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            Provider · My Schedule
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Appointments
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Filter, search, and manage today’s visits.
          </p>
        </div>

        {/* Quick summary chips */}
        <div className="flex flex-wrap gap-2">
          <StatChip label="Total" value={total} />
          <StatChip label="Page" value={page} />
          <button
            onClick={() => updateQuery({})}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-blue-200 hover:text-blue-700"
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
          </div>

          {/* right: selects + quick date */}
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
              <option value="CHECK_IN">Check-in</option>
              <option value="COMPLETE">Complete</option>
              <option value="CANCELLED">Cancelled</option>
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
              <option value="all">All</option>
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
        <CardHead title="My Appointments" subtitle={`Total: ${total}`} />
        {isLoading ? (
          <div className="p-6 text-sm text-slate-600">Loading appointments…</div>
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
                  <Th>Reason</Th>
                  <Th>Time</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length ? (
                  rows.map((a) => {
                    const time =
                      a.scheduled_for || a.start_time || a.date || a.time || "—";
                    return (
                      <tr key={a.id} className="transition hover:bg-slate-50/60">
                        <Td>
                          <div className="flex items-center gap-2">
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600/10">
                              <UserRound className="h-4 w-4 text-blue-700" />
                            </span>
                            <span className="font-medium text-slate-900">
                              {a.patient_name || a.patient || "—"}
                            </span>
                          </div>
                        </Td>
                        <Td className="text-slate-600">{a.reason || "Consultation"}</Td>
                        <Td>
                          <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                            {time}
                          </span>
                        </Td>
                        <Td>
                          <StatusPill value={a.status || "SCHEDULED"} />
                        </Td>
                        <Td className="text-right">
                          <a
                            href={`/provider/appointments/${a.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:border-blue-200 hover:text-blue-700"
                          >
                            Open
                            <ChevronRight className="h-4 w-4" />
                          </a>
                        </Td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        title="No appointments"
                        subtitle="When you’re booked, visits will appear here automatically."
                        icon={CalendarRange}
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
          <div>Page {page} · {total} total</div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => updateQuery({ page: page - 1 })}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!rows.length || rows.length < limit}
              onClick={() => updateQuery({ page: page + 1 })}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 disabled:opacity-50"
            >
              Next
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
    <th className={`px-4 py-3 text-xs font-medium uppercase tracking-wide ${className}`}>
      {children}
    </th>
  );
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="py-10 text-center">
      <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <div className="text-sm font-medium text-slate-900">{title}</div>
      {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
    </div>
  );
}

function StatusPill({ value }) {
  const v = String(value || "").toUpperCase();
  const map = {
    SCHEDULED: "bg-slate-50 text-slate-700 ring-slate-200",
    CHECK_IN: "bg-blue-50 text-blue-700 ring-blue-200",
    COMPLETE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  const cls = map[v] || "bg-amber-50 text-amber-700 ring-amber-200";
  const label = (v || "—").replaceAll("_", " ");
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-1 text-xs ring-1 ${cls}`}>
      {label}
    </span>
  );
}

function StatChip({ label, value }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
