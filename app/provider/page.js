// =============================
// app/provider/page.js
// =============================
export const dynamic = "force-dynamic";

import {
  CalendarRange,
  BellRing,
  ShieldCheck,
  ClipboardCheck,
  FlaskConical,
  Image as ImagingIcon,
  Pill,
  ChevronRight,
  ArrowRight,
  UserRound,
} from "lucide-react";

async function safeFetchJSONProvider(path, fallback) {
  try {
    const r = await fetch(`/api/proxy${path}`, { cache: "no-store" });
    if (!r.ok) return fallback;
    return await r.json();
  } catch (e) {
    return fallback;
  }
}

export default async function ProviderDashboard() {
  const [notifications, myAppointments] = await Promise.all([
    safeFetchJSONProvider("/notifications/items/?since=7d", []),
    safeFetchJSONProvider("/appointments/?date=today&mine=true&limit=10", []),
  ]);

  const stats = [
    {
      label: "My Appointments Today",
      value: Array.isArray(myAppointments) ? myAppointments.length : 0,
      icon: CalendarRange,
      accent: "from-blue-600 via-indigo-600 to-violet-600",
      href: "/appointments",
      cta: "Open schedule",
    },
    {
      label: "Notifications (7d)",
      value: Array.isArray(notifications) ? notifications.length : 0,
      icon: BellRing,
      accent: "from-amber-600 via-orange-600 to-red-600",
      href: "/notifications",
      cta: "View notifications",
    },
    {
      label: "Quick Check",
      valueText: "Authenticated session active",
      icon: ShieldCheck,
      accent: "from-emerald-600 via-teal-600 to-cyan-600",
      href: "/profile",
      cta: "Manage profile",
      isText: true,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          Provider Home
        </h1>
        <p className="mt-1 text-slate-600">Today&apos;s schedule and recent updates.</p>
      </header>

      {/* Stat tiles */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* Today’s appointments */}
      <section className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardHead
          title="Today’s Appointments"
          href="/appointments"
          icon={CalendarRange}
          actionLabel="Open schedule"
        />
        <ul className="divide-y divide-slate-100">
          {(Array.isArray(myAppointments) ? myAppointments : []).slice(0, 10).map((a, idx) => (
            <li key={idx} className="p-4 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-600/10">
                    <UserRound className="h-4 w-4 text-blue-700" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">
                      {a?.patient_name || a?.patient || "Patient"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {a?.reason || a?.visit_type || "Appointment"}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600">
                  {a?.scheduled_time || a?.time || "—"}
                </div>
              </div>
            </li>
          ))}
          {(!myAppointments || myAppointments.length === 0) && (
            <EmptyState
              icon={CalendarRange}
              title="No appointments scheduled for today"
              subtitle="Your booked visits will show up here."
              ctaHref="/appointments"
              ctaLabel="Open schedule"
            />
          )}
        </ul>
      </section>

      {/* Quick actions */}
      <section className="mt-10">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-medium text-slate-900">Quick Actions</div>
            <span className="text-xs text-slate-500">Common workflows at a glance</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <QuickAction href="/encounters/new" icon={ClipboardCheck} label="New Note" />
            <QuickAction href="/labs/new" icon={FlaskConical} label="Order Lab" />
            <QuickAction href="/imaging/new" icon={ImagingIcon} label="Request Imaging" />
            <QuickAction href="/pharmacy/prescriptions/new" icon={Pill} label="Write Prescription" />
          </div>
        </div>
      </section>
    </div>
  );
}

/* --------------------------- UI bits (UI-only) --------------------------- */

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
    <li className="p-8 text-center">
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
    </li>
  );
}

function QuickAction({ href, icon: Icon, label }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
    >
      <Icon className="h-4 w-4 text-slate-700" />
      <span className="text-sm">{label}</span>
    </a>
  );
}
