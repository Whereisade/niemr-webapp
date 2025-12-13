export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import GreetingLine from "@/components/GreetingLine";
import LogoutButton from "@/components/LogoutButton";
import NotificationsBell from "@/components/notifications/NotificationsBell";
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
  Bed,
  ClipboardClock,
} from "lucide-react";

const BACKEND = process.env.NIEMR_BACKEND_URL || "http://localhost:8000";
const ACCESS_COOKIE = process.env.ACCESS_COOKIE || "niemr_access";

async function safeFetchJSON(path, fallback) {
  try {
    const res = await fetch(`/api/proxy${path}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

async function fetchMe() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${BACKEND}/api/accounts/me/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function normalizeListAndCount(payload) {
  // Plain list
  if (Array.isArray(payload)) {
    return { list: payload, count: payload.length };
  }

  // Paginated: { count, results: [...] }
  if (payload && Array.isArray(payload.results)) {
    return {
      list: payload.results,
      count:
        typeof payload.count === "number"
          ? payload.count
          : payload.results.length,
    };
  }

  // Fallback
  return { list: [], count: 0 };
}

// 🔹 Facility role helpers
const FACILITY_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "FRONTDESK",
  "DOCTOR",
  "NURSE",
  "LAB",
  "PHARMACY",
];

function facilitySubtitle(role) {
  if (!role) {
    return "Monitor operations, clinical load, and financials across the facility.";
  }

  if (role === "FRONTDESK") {
    return "Manage bookings, arrivals, and patient check-ins.";
  }

  if (role === "SUPER_ADMIN" || role === "ADMIN") {
    return "Monitor operations, clinical load, and financials across the facility.";
  }

  if (["DOCTOR", "NURSE", "LAB", "PHARMACY"].includes(role)) {
    return "See a quick overview of today’s activity at this facility.";
  }

  return "Facility workspace.";
}

export default async function FacilityDashboard() {
  const [notifications, todaysAppointments, providers, me] = await Promise.all([
    safeFetchJSON("/notifications/items/?since=7d", []),
    safeFetchJSON("/appointments/?date=today&limit=10", []),
    safeFetchJSON("/providers/?limit=5", []),
    fetchMe(),
  ]);

  // 🔐 Only facility-linked staff should see this dashboard
  if (!me) {
    redirect("/login/facility");
  }

  if (!FACILITY_ROLES.includes(me.role)) {
    redirect("/login/facility");
  }

  const notifList = Array.isArray(notifications)
    ? notifications
    : notifications?.results || [];

  const { list: appts, count: todaysApptCount } = normalizeListAndCount(
    todaysAppointments
  );

  const provs = Array.isArray(providers)
    ? providers
    : providers?.results || [];

  const unreadCount = notifList.filter((n) => {
    if (!n) return false;
    if (typeof n.unread === "boolean") return n.unread;
    if (typeof n.is_read === "boolean") return !n.is_read;
    if (typeof n.read === "boolean") return !n.read;
    return !n.read_at;
  }).length;

  const greetingName =
    [me?.first_name, me?.last_name].filter(Boolean).join(" ") ||
    me?.email ||
    "";

  const facilityName = me?.facility?.name || "";

  const greetingTarget = facilityName
    ? greetingName
      ? `${greetingName} · ${facilityName}`
      : facilityName
    : greetingName;

  const stats = [
    {
      label: "Total Appointments",
      value: todaysApptCount,
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
      value: unreadCount,
      icon: BellRing,
      accent: "from-amber-600 via-orange-600 to-red-600",
      href: "/notifications",
      cta: unreadCount > 0 ? "View unread" : "View notifications",
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
          <GreetingLine
            name={greetingTarget}
            className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900"
          />
          <p className="mt-1 text-slate-600">
            {facilitySubtitle(me?.role)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <NotificationsBell href="/notifications" />

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

            <Link
              href="/facility/pharmacy"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Facility Prescriptions
            </Link>

            <Link
              href="/notifications"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Facility Notifications
            </Link>

            <Link
              href="/facility/billing"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Facility Billing
            </Link>

            <Link
              href="/facility/payments"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Facility Payments
            </Link>
          </div>
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
              <div className="mt-2 text-3xl font-semibold text-slate-900">
                {value}
              </div>
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
                      <Td>
                        {a.provider_name || a.provider?.full_name || "Provider"}
                      </Td>
                      <Td className="text-slate-600">
                        {a.reason || "Consultation"}
                      </Td>
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
              <p className="mt-1 text-sm text-slate-600">
                Jump into common workflows.
              </p>
              <div className="mt-4 grid gap-2">
                <QuickLink
                  href="/facility/appointments/new"
                  icon={CalendarRange}
                  label="Schedule Appointment"
                />
                <QuickLink
                  href="/encounters/new"
                  icon={Stethoscope}
                  label="New Encounter"
                />
                <QuickLink
                  href="/facility/patients"
                  icon={Users2}
                  label="Patients"
                />
                <QuickLink
                  href="/facility/labs/new"
                  icon={FileText}
                  label="Order Lab"
                />
                <QuickLink
                  href="/facility/imaging/new"
                  icon={ClipboardList}
                  label="Request Imaging"
                />
                <QuickLink href="/facility/wards" icon={Bed} label="Wards" />
                <QuickLink
                  href="/facility/bed-history"
                  icon={ClipboardClock}
                  label="Ward Bed History"
                />
                <QuickLink
                  href="/notifications"
                  icon={BellRing}
                  label="Notifications"
                  badge={
                    unreadCount > 0
                      ? unreadCount > 99
                        ? "99+"
                        : `${unreadCount} new`
                      : undefined
                  }
                />
                <QuickLink
                  href="/facility/audit"
                  icon={ClipboardClock}
                  label="Audit logs"
                />
                <Link
                  href="/facility/reports"
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition hover:border-slate-400 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        Reports & PDFs
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Download encounter, lab, imaging and billing PDFs.
                      </p>
                    </div>
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-slate-500">
                    Facility staff only
                  </p>
                </Link>

                <Link
                  href="/facility/emails"
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-500 hover:shadow-md"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Email outbox
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Review sent and failed emails, and trigger resends when
                      needed.
                    </p>
                  </div>
                  <span className="mt-3 text-xs font-medium text-blue-600 group-hover:underline">
                    Open outbox
                  </span>
                </Link>
                <Link
                  href="/settings/profile"
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-500 hover:shadow-md"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Account profile
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Update your name and review the account linked to this
                      login.
                    </p>
                  </div>
                  <span className="mt-3 text-xs font-medium text-blue-600 group-hover:underline">
                    Open profile
                  </span>
                </Link>
                <Link
                  href="/settings/notifications"
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-500 hover:shadow-md"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Notification settings
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Choose which alerts you receive for appointments, labs,
                      imaging, and billing.
                    </p>
                  </div>
                  <span className="mt-3 text-xs font-medium text-blue-600 group-hover:underline">
                    Manage notifications
                  </span>
                </Link>
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
                  <li
                    key={p.id || i}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
                        <Stethoscope className="h-5 w-5 text-slate-700" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          {p.full_name || p.name || "Provider"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {p.provider_type || "—"}
                        </div>
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
                  <div className="text-sm text-slate-600">
                    No providers to show.
                  </div>
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
                  <h3 className="text-slate-900 font-medium">
                    Compliance & Backups
                  </h3>
                  <p className="text-xs text-slate-500">
                    Auto-backups enabled; data retention set to 24 months.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <span className="rounded-lg border border-slate-200 px-3 py-2">
                  Last backup: <b>02:40</b>
                </span>
                <span className="rounded-lg border border-slate-200 px-3 py-2">
                  Retention: <b>24 mo</b>
                </span>
                <span className="rounded-lg border border-slate-200 px-3 py-2 col-span-2">
                  Encryption: <b>AES-256 at rest</b>
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Notifications */}
      <section className="mt-10">
        <CardHead
          title="Recent Notifications"
          href="/notifications"
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
                <div className="text-sm text-slate-600">
                  No recent notifications.
                </div>
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
              <h3 className="text-slate-900 font-semibold">
                Need to add a new service?
              </h3>
              <p className="text-sm text-slate-600">
                Expand your catalog for orders, imaging, pharmacy, and billing
                in a few clicks.
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
      <a
        className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
        href={href}
      >
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
      {subtitle ? (
        <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
      ) : null}
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
  return (
    <td
      className={`px-4 py-3 align-middle text-sm text-slate-700 ${className}`}
    >
      {children}
    </td>
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
    <span
      className={`inline-flex items-center rounded-lg px-2 py-1 text-xs ring-1 ${cls}`}
    >
      {label}
    </span>
  );
}

function QuickLink({ href, icon: Icon, label, badge }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 hover:border-blue-200 hover:text-blue-700"
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
        {badge && (
          <span className="inline-flex items-center justify-center rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
            {badge}
          </span>
        )}
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
