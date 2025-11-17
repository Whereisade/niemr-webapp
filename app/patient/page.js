// app/patient/page.js
export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  CalendarRange,
  BellRing,
  ClipboardList,
  ArrowRight,
  ChevronRight,
  UserRound,
  FileText,
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

export default async function PatientDashboard() {
  const [myAppointments, notifications] = await Promise.all([
    safeFetchJSON("/appointments/?mine=true&limit=10", []),
    safeFetchJSON("/notifications/items/?since=7d", []),
  ]);

  const appts     = Array.isArray(myAppointments) ? myAppointments : (myAppointments?.results || []);
  const notifList = Array.isArray(notifications) ? notifications : (notifications?.results || []);

  const stats = [
    {
      label: "Upcoming Appointments",
      value: appts.length,
      icon: CalendarRange,
      accent: "from-blue-600 via-indigo-600 to-violet-600",
      href: "/patient/appointments",
      cta: "View appointments",
    },
    {
      label: "New Notifications (7d)",
      value: notifList.length,
      icon: BellRing,
      accent: "from-amber-600 via-orange-600 to-red-600",
      href: "/patient/notifications",
      cta: "View notifications",
    },
  ];

  return (
    <main className="relative mx-auto max-w-7xl p-6 md:p-10">
      {/* soft background accents for consistency */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100 blur-3xl opacity-60" />

      {/* Header */}
      <header className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            Patient Portal
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Patient Home
          </h1>
          <p className="mt-1 text-slate-600">Upcoming visits and recent messages.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/patient/encounters"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700"
          >
            My Encounters
          </Link>
          <Link
            href="/patient/vitals"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700"
          >
            My Vitals
          </Link>
          <Link
            href="/patient/labs"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            My Lab Tests
          </Link>
          <Link
            href="/patient/imaging"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            My Imaging Tests
          </Link>
        </div>
      </header>

      {/* Stat tiles + CTA */}
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

        {/* Appointments shortcut */}
        <a
          href="/patient/appointments"
          className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600/70 via-indigo-600/70 to-violet-600/70" />
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">Appointments</div>
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
                <ClipboardList className="h-5 w-5 text-slate-700" />
              </div>
            </div>
            <div className="mt-2 text-lg font-semibold text-slate-900">View all</div>
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700">
              Go to list
              <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </div>
          </div>
        </a>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Upcoming appointments */}
        <section className="lg:col-span-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHead
            title="My Upcoming Appointments"
            href="/patient/appointments"
            icon={CalendarRange}
            actionLabel="View all"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
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
                      <Td>
                        <div className="flex items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600/10">
                            <UserRound className="h-4 w-4 text-blue-700" />
                          </span>
                          <span className="font-medium text-slate-900">
                            {a.provider_name || a.provider?.full_name || "Provider"}
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
                        title="No upcoming appointments"
                        subtitle="Booked visits will appear here automatically."
                        ctaHref="/patient/appointments"
                        ctaLabel="View appointments"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right rail: quick actions + records shortcut */}
        <aside className="space-y-6">
          {/* Quick actions */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
            <div className="p-5">
              <h3 className="text-slate-900 font-medium">Quick Actions</h3>
              <p className="mt-1 text-sm text-slate-600">Get things done faster.</p>
              <div className="mt-4 grid gap-2">
                <QuickLink href="/appointments/new" icon={Plus} label="Book Appointment" />
                <QuickLink href="/records" icon={FileText} label="View Records" />
                <QuickLink href="/profile" icon={UserRound} label="Update Profile" />
                <Link
                  href="/patient/labs"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  My Lab Tests
                </Link>

                <Link
                  href="/patient/pharmacy"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  My Prescriptions
                </Link>

                <Link
                  href="/patient/notifications"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  My Notifications
                </Link>

                <Link
                  href="/patient/billing"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  My Charges
                </Link>
              </div>
            </div>
          </div>

          {/* Records highlight (dummy) */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
            <div className="text-slate-900 font-semibold">Download recent results</div>
            <p className="mt-1 text-sm text-slate-600">
              Get your latest labs, imaging, and prescriptions in one place.
            </p>
            <Link
              href="/records"
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              Open Records
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </div>

      {/* Notifications */}
      <section className="mt-10">
        <CardHead
          title="Recent Notifications"
          href="/patient/notifications"
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
                  <div className="text-slate-600">
                    {n.body || n.message || ""}
                  </div>
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
  return <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide">{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
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
