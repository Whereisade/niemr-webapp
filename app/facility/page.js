// app/facility/page.js
export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  CalendarRange,
  Users2,
  BellRing,
  ArrowRight,
  ChevronRight,
  ClipboardList,
  Building2,
  Stethoscope,
  Activity,
  LineChart,
  FileText,
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

export default async function FacilityDashboard() {
  const [notifications, todaysAppointments, providers] = await Promise.all([
    safeFetchJSON("/notifications/items/?since=7d", []),
    safeFetchJSON("/appointments/?date=today&limit=10", []),
    safeFetchJSON("/providers/?limit=5", []), // harmless if perms required
  ]);

  const notifList = Array.isArray(notifications) ? notifications : (notifications?.results || []);
  const appts     = Array.isArray(todaysAppointments) ? todaysAppointments : (todaysAppointments?.results || []);
  const provs     = Array.isArray(providers) ? providers : (providers?.results || []);

  const stats = [
    {
      label: "Today’s Appointments",
      value: appts.length,
      icon: CalendarRange,
      accent: "from-blue-600 via-indigo-600 to-violet-600",
      href: "/facility/appointments",
      cta: "Open schedule",
    },
    {
      label: "Active Providers (preview)",
      value: provs.length,
      icon: Users2,
      accent: "from-emerald-600 via-teal-600 to-cyan-600",
      href: "/facility/providers",
      cta: "View providers",
    },
    {
      label: "Notifications (7d)",
      value: notifList.length,
      icon: BellRing,
      accent: "from-amber-600 via-orange-600 to-red-600",
      href: "/facility/notifications",
      cta: "View notifications",
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
            <Building2 className="h-3.5 w-3.5" />
            Facility Workspace
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Facility Home
          </h1>
          <p className="mt-1 text-slate-600">Snapshot across your clinic.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/facility/encounters"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700"
          >
            Facility Encounters
          </Link>
          <Link
            href="/facility/vitals"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700"
          >
            Facility Vitals
          </Link>
          <Link
            href="/facility/labs"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Facility Lab Orders
          </Link>
          <Link
            href="/facility/imaging"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Facility Imaging Requests
          </Link>
        </div>
      </header>

      {/* Stat tiles */}
      <section className="grid gap-4 md:grid-cols-3 mb-8">
        {stats.map(({ label, value, icon: Icon, accent, href, cta }) => (
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
              <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                {cta}
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </div>
            </div>
          </a>
        ))}

        {/* Scheduling tile (extra CTA) */}
        <a
          href="/facility/appointments"
          className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600/70 via-indigo-600/70 to-violet-600/70" />
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">Scheduling</div>
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
                <ClipboardList className="h-5 w-5 text-slate-700" />
              </div>
            </div>
            <div className="mt-2 text-lg font-semibold text-slate-900">
              View all appointments
            </div>
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700">
              Go to schedule
              <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </div>
          </div>
        </a>
      </section>

      {/* At-a-glance (dummy mini charts / health) */}
      <section className="mb-10 grid gap-4 lg:grid-cols-3">
        <DummyMiniChart
          title="Check-in vs. No-shows (7d)"
          icon={Activity}
          gradient="from-emerald-500/10 to-emerald-600/10"
          hint="Trending up by 6% WoW"
        />
        <DummyMiniChart
          title="Avg. wait time today"
          icon={LineChart}
          gradient="from-amber-500/10 to-amber-600/10"
          hint="~ 11 mins avg"
        />
        <DummyMiniChart
          title="Orders → Results (last 24h)"
          icon={FileText}
          gradient="from-violet-500/10 to-violet-600/10"
          hint="82% completed"
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Appointments table */}
        <section className="lg:col-span-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHead
            title="Today’s Appointments"
            href="/facility/appointments"
            icon={CalendarRange}
            actionLabel="View all"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <Th>Patient</Th>
                  <Th>Provider</Th>
                  <Th>Reason</Th>
                  <Th>Time</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appts.length ? (
                  appts.map((a) => (
                    <tr key={a.id} className="transition hover:bg-slate-50/60">
                      <Td className="font-medium text-slate-900">
                        {a.patient_name || a.patient?.full_name || "Patient"}
                      </Td>
                      <Td>{a.provider_name || a.provider?.full_name || "Provider"}</Td>
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
                    <td colSpan={5}>
                      <EmptyState
                        icon={CalendarRange}
                        title="No appointments for today"
                        subtitle="Scheduled visits will appear here automatically."
                        ctaHref="/facility/appointments"
                        ctaLabel="Open schedule"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right rail: quick actions + providers preview + compliance */}
        <aside className="space-y-6">
          {/* Quick actions */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
            <div className="p-5">
              <h3 className="text-slate-900 font-medium">Quick Actions</h3>
              <p className="mt-1 text-sm text-slate-600">Jump into common workflows.</p>
              <div className="mt-4 grid gap-2">
                <QuickLink href="/encounters/new" icon={Stethoscope} label="New Encounter" />
                <QuickLink href="/facility/appointments/new" icon={CalendarRange} label="Schedule Appointment" />
                <QuickLink href="/labs/new" icon={FileText} label="Order Lab" />
                <QuickLink href="/imaging/new" icon={ClipboardList} label="Request Imaging" />
              </div>
            </div>
          </div>

          {/* Providers preview */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardHead
              title="Providers (preview)"
              href="/facility/providers"
              icon={Users2}
              actionLabel="Manage"
            />
            <ul className="divide-y divide-slate-100">
              {provs.length ? (
                provs.map((p, i) => (
                  <li key={p.id || i} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
                        <Stethoscope className="h-5 w-5 text-slate-700" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{p.full_name || p.name || "Provider"}</div>
                        <div className="text-xs text-slate-500">{p.provider_type || "—"}</div>
                      </div>
                    </div>
                    <Link
                      href={`/facility/providers/${p.id || ""}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
                    >
                      Open <ChevronRight className="h-4 w-4" />
                    </Link>
                  </li>
                ))
              ) : (
                <li className="p-6">
                  <div className="text-sm text-slate-600">No providers to show.</div>
                </li>
              )}
            </ul>
          </div>

          {/* Compliance note (dummy info) */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600" />
            <div className="p-5">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50">
                  <ShieldCheck className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-slate-900 font-medium">Compliance & Backups</h3>
                  <p className="text-xs text-slate-500">Auto-backups enabled; data retention set to 24 months.</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <span className="rounded-lg border border-slate-200 px-3 py-2">Last backup: <b>02:40</b></span>
                <span className="rounded-lg border border-slate-200 px-3 py-2">Retention: <b>24 mo</b></span>
                <span className="rounded-lg border border-slate-200 px-3 py-2 col-span-2">Encryption: <b>AES-256 at rest</b></span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Notifications */}
      <section className="mt-10">
        <CardHead
          title="Recent Notifications"
          href="/facility/notifications"
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
                <div className="text-sm text-slate-600">No recent notifications.</div>
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* Footer CTA (dummy) */}
      <section className="mt-10">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h3 className="text-slate-900 font-semibold">Need to add a new service?</h3>
              <p className="text-sm text-slate-600">
                Expand your catalog for orders, imaging, pharmacy, and billing in a few clicks.
              </p>
            </div>
            <Link
              href="/facility/services/new"
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4" />
              Add Service
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ────────────────────────── UI helpers (UI-only) ────────────────────────── */

function CardHead({ title, href, icon: Icon, actionLabel }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200/70 p-5">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
        <h2 className="font-medium text-slate-900">{title}</h2>
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
  return (
    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
      {children}
    </th>
  );
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
        {/* Dummy chart bars */}
        <div className="grid grid-cols-12 items-end gap-1.5 h-20">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="rounded-md bg-gradient-to-t from-slate-200 to-slate-100"
              style={{ height: `${30 + ((i * 13) % 60)}%` }}
            />
          ))}
        </div>
        <div className="mt-3 text-xs text-slate-500">{hint}</div>
      </div>
    </div>
  );
}
