// app/provider/page.js
export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  CalendarRange,
  BellRing,
  ClipboardList,
  ArrowRight,
  ChevronRight,
  UserRound,
  Stethoscope,
  FileText,
  Pill,
  Activity,
  LineChart,
  ShieldCheck,
  Plus,
} from "lucide-react";

async function safeFetchJSON(path, fallback) {
  try {
    const r = await fetch(`/api/proxy${path.endsWith("/") ? path : path + "/"}`, { cache: "no-store" });
    if (!r.ok) return fallback;
    return await r.json();
  } catch {
    return fallback;
  }
}

export default async function ProviderDashboard() {
  const [notifications, myAppointments] = await Promise.all([
    safeFetchJSON("/notifications/items/?since=7d", []),
    safeFetchJSON("/appointments/?date=today&mine=true&limit=10", []),
  ]);

  const notifList = Array.isArray(notifications) ? notifications : (notifications?.results || []);
  const appts     = Array.isArray(myAppointments) ? myAppointments : (myAppointments?.results || []);

  const stats = [
    {
      label: "Today’s Appointments",
      value: appts.length,
      icon: CalendarRange,
      accent: "from-blue-600 via-indigo-600 to-violet-600",
      href: "/provider/appointments",
      cta: "Open schedule",
    },
    {
      label: "New Notifications (7d)",
      value: notifList.length,
      icon: BellRing,
      accent: "from-amber-600 via-orange-600 to-red-600",
      href: "/provider/notifications",
      cta: "View notifications",
    },
    {
      label: "Go to schedule",
      valueText: "View all appointments",
      icon: ClipboardList,
      accent: "from-emerald-600 via-teal-600 to-cyan-600",
      href: "/provider/appointments",
      cta: "Open",
      isText: true,
    },
  ];

  return (
    <main className="relative mx-auto max-w-7xl p-6 md:p-10">
      {/* soft background accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100 blur-3xl opacity-60" />

      {/* Header */}
      <header className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <Stethoscope className="h-3.5 w-3.5" />
            Provider Workspace
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Provider Home
          </h1>
          <p className="mt-1 text-slate-600">Today’s schedule and recent updates.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/provider/encounters"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700"
          >
            View Encounters
          </Link>
          <Link
            href="/provider/vitals"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700"
          >
            View Vitals
          </Link>
          <Link
            href="/provider/labs"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            View Lab Orders
          </Link>
          <Link
            href="/provider/imaging"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            View Imaging Requests
          </Link>
        </div>
      </header>

      {/* Stat tiles */}
      <section className="grid gap-4 md:grid-cols-3 mb-8">
        {stats.map(({ label, value, valueText, icon: Icon, accent, href, cta, isText }) => (
          <a
            key={label}
            href={href}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">{label}</div>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
                  <Icon className="h-5 w-5 text-slate-700" />
                </div>
              </div>
              {isText ? (
                <div className="mt-2 text-slate-900">{valueText}</div>
              ) : (
                <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
              )}
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                {cta}
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </div>
            </div>
          </a>
        ))}
      </section>

      {/* At-a-glance (dummy mini widgets) */}
      <section className="mb-10 grid gap-4 lg:grid-cols-3">
        <DummyMiniChart
          title="Visits completed today"
          icon={Activity}
          gradient="from-emerald-500/10 to-emerald-600/10"
          hint="You’re ahead of yesterday"
        />
        <DummyMiniChart
          title="Avg. note completion time"
          icon={LineChart}
          gradient="from-amber-500/10 to-amber-600/10"
          hint="~ 7 mins / encounter"
        />
        <DummyMiniChart
          title="e-Rx & Lab turnaround"
          icon={Pill}
          gradient="from-violet-500/10 to-violet-600/10"
          hint="76% completed (24h)"
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Appointments table */}
        <section className="lg:col-span-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHead
            title="Today’s Appointments"
            href="/provider/appointments"
            icon={CalendarRange}
            actionLabel="View all"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <Th>Patient</Th>
                  <Th>Reason</Th>
                  <Th>Time</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appts.length ? (
                  appts.map((a) => (
                    <tr key={a.id} className="transition hover:bg-slate-50/60">
                      <Td>
                        <div className="flex items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600/10">
                            <UserRound className="h-4 w-4 text-blue-700" />
                          </span>
                          <span className="font-medium text-slate-900">
                            {a.patient_name || a.patient?.full_name || "Patient"}
                          </span>
                        </div>
                      </Td>
                      <Td className="text-slate-600">{a.reason || "Consultation"}</Td>
                      <Td>
                        <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                          {a.start_time || a.time || "—"}
                        </span>
                      </Td>
                      <Td>
                        <StatusPill value={a.status || "scheduled"} />
                      </Td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState
                        icon={CalendarRange}
                        title="No appointments for today"
                        subtitle="Your booked visits will show here automatically."
                        ctaHref="/provider/appointments"
                        ctaLabel="Open schedule"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right rail: quick actions + profile tip + compliance */}
        <aside className="space-y-6">
          {/* Quick actions */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
            <div className="p-5">
              <h3 className="text-slate-900 font-medium">Quick Actions</h3>
              <p className="mt-1 text-sm text-slate-600">Start common tasks faster.</p>
              <div className="mt-4 grid gap-2">
                <QuickLink href="/encounters/new" icon={Stethoscope} label="New Note" />
                <QuickLink href="/labs/new" icon={FileText} label="Order Lab" />
                <QuickLink href="/imaging/new" icon={ClipboardList} label="Request Imaging" />
                <QuickLink href="/pharmacy/prescriptions/new" icon={Pill} label="Write e-Rx" />

                <Link
                  href="/provider/pharmacy"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  View Prescriptions
                </Link>

                <Link
                  href="/provider/notifications"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Notifications
                </Link>
              </div>
            </div>
          </div>

          {/* Profile completeness (dummy) */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600" />
            <div className="p-5">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50">
                  <ShieldCheck className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-slate-900 font-medium">Profile & Verification</h3>
                  <p className="text-xs text-slate-500">License on file · Expires: <b>2026-03-31</b></p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <span className="rounded-lg border border-slate-200 px-3 py-2">Profile: <b>92%</b></span>
                <span className="rounded-lg border border-slate-200 px-3 py-2">e-Rx: <b>Enabled</b></span>
                <span className="rounded-lg border border-slate-200 px-3 py-2 col-span-3">
                  Council: <b>MDCN</b> · Specialty: <b>General Practice</b>
                </span>
              </div>
            </div>
          </div>

          {/* Add patient (dummy CTA) */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
            <div className="flex flex-col items-start justify-between gap-4">
              <div>
                <h3 className="text-slate-900 font-semibold">Need to add a patient?</h3>
                <p className="text-sm text-slate-600">Create a new patient profile and schedule a first visit.</p>
              </div>
              <Link
                href="@/patients/self-register/"
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4" />
                New Patient
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Recent notifications */}
      <section className="mt-10">
        <CardHead
          title="Recent Notifications"
          href="/provider/notifications"
          icon={BellRing}
          actionLabel="View all"
        />
        <div className="rounded-2xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {notifList.length ? (
              notifList.slice(0, 6).map((n, i) => (
                <li key={n.id || i} className="p-4 text-sm">
                  <div className="font-medium text-slate-900">
                    {n.title || n.kind || "Notification"}
                  </div>
                  <div className="text-slate-600">{n.body || n.message || ""}</div>
                </li>
              ))
            ) : (
              <li className="p-6">
                <div className="text-sm text-slate-600">You’re all caught up.</div>
              </li>
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}

/* ─────────────── UI helpers (UI-only) ─────────────── */

function CardHead({ title, href, icon: Icon, actionLabel }) {
  return (
    <div className="flex items-center justify-between p-5 border-b border-slate-200/70">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
        <h2 className="text-slate-900 font-medium">{title}</h2>
      </div>
      <a className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline" href={href}>
        {actionLabel}
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle, ctaHref, ctaLabel }) {
  return (
    <div className="py-10 text-center">
      <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <div className="text-sm font-medium text-slate-900">{title}</div>
      {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
      {ctaHref && ctaLabel ? (
        <div className="mt-4">
          <a
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 hover:border-blue-200 hover:text-blue-700"
          >
            {ctaLabel}
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      ) : null}
    </div>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 align-middle text-sm text-slate-700 ${className}`}>{children}</td>;
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

function QuickLink({ href, icon: Icon, label }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 hover:border-blue-200 hover:text-blue-700"
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

function DummyMiniChart({ title, icon: Icon, gradient, hint }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-900">{title}</div>
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
            <Icon className="h-5 w-5 text-slate-700" />
          </div>
        </div>
        {/* Dummy bars */}
        <div className="grid h-20 grid-cols-12 items-end gap-1.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="rounded-md bg-gradient-to-t from-slate-200 to-slate-100"
              style={{ height: `${35 + ((i * 11) % 50)}%` }}
            />
          ))}
        </div>
        <div className="mt-3 text-xs text-slate-500">{hint}</div>
      </div>
    </div>
  );
}
