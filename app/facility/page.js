// app/facility/page.js
export const dynamic = "force-dynamic";

import {
  CalendarRange,
  Users2,
  BellRing,
  ArrowRight,
  ChevronRight,
  ClipboardList,
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
    <main className="mx-auto max-w-7xl p-6 md:p-10">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          Facility Home
        </h1>
        <p className="mt-1 text-slate-600">Snapshot across your clinic.</p>
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

        {/* Scheduling tile (kept your CTA idea, upgraded UI) */}
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

      {/* Appointments table */}
      <section className="mb-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                  <tr key={a.id}>
                    <Td>{a.patient_name || a.patient?.full_name || "Patient"}</Td>
                    <Td>{a.provider_name || a.provider?.full_name || "Provider"}</Td>
                    <Td className="text-slate-600">{a.reason || "Consultation"}</Td>
                    <Td>
                      <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                        {a.start_time || a.time || "—"}
                      </span>
                    </Td>
                    <Td className="capitalize">{a.status || "scheduled"}</Td>
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

      {/* Notifications */}
      <section>
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

/* ────────────────────────── UI helpers (UI-only) ────────────────────────── */

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
