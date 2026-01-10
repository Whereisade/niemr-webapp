// app/patient/page.js - UPDATED VERSION WITH HMO CARD
// This shows the changes needed to integrate the HMO Summary Card

export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import GreetingLine from "@/components/GreetingLine";
import NotificationsBell from "@/components/notifications/NotificationsBell";
import HMOSummaryCard from "@/components/patient/HMOSummaryCard"; // 🆕 ADD THIS IMPORT
import {
  CalendarRange,
  BellRing,
  ClipboardList,
  ArrowRight,
  ChevronRight,
  UserRound,
  FileText,
  Plus,
  Activity,
  Heart,
  Pill,
  FlaskConical,
  Scan,
  CreditCard,
  Users,
  Shield,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
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

// 🆕 ADD THIS FUNCTION to fetch patient profile with HMO data
async function fetchPatientProfile(token) {
  try {
    const res = await fetch(`${BACKEND}/api/patients/?mine=true&limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const patients = Array.isArray(data) ? data : data?.results || [];
    return patients[0] || null;
  } catch {
    return null;
  }
}

export default async function PatientDashboard() {
  // 🆕 UPDATE THIS SECTION to fetch patient profile
  const me = await fetchMe();
  
  if (!me) {
    redirect("/login/patient");
  }

  if (me.role !== "PATIENT") {
    redirect("/login/patient");
  }

  // 🆕 Fetch patient profile with HMO data
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  const patientProfile = await fetchPatientProfile(token);

  // Existing fetches
  const [myAppointments, notifications] = await Promise.all([
    safeFetchJSON("/appointments/?mine=true&limit=10", []),
    safeFetchJSON("/notifications/?limit=10", []),
  ]);

  const appts = Array.isArray(myAppointments)
    ? myAppointments
    : myAppointments?.results || [];

  const notifList = Array.isArray(notifications)
    ? notifications
    : notifications?.results || [];

  const unreadCount = notifList.filter((n) => {
    if (!n) return false;
    if (typeof n.unread === "boolean") return n.unread;
    if (typeof n.is_read === "boolean") return !n.is_read;
    return !n.read_at;
  }).length;

  const upcomingAppts = appts.filter(
    (a) => a.status !== "COMPLETE" && a.status !== "CANCELLED"
  );

  const greetingName =
    [me?.first_name, me?.last_name].filter(Boolean).join(" ") ||
    me?.email ||
    "";

  const stats = [
    {
      label: "Upcoming Visits",
      value: upcomingAppts.length,
      icon: CalendarRange,
      trend: upcomingAppts.length > 0 ? "Next soon" : null,
      accent: "from-blue-500 to-indigo-600",
      bgAccent: "bg-blue-50",
      iconColor: "text-blue-600",
      href: "/patient/appointments",
      cta: "View schedule",
    },
    {
      label: "Health Records",
      value: "12",
      icon: FileText,
      trend: "Up to date",
      accent: "from-emerald-500 to-teal-600",
      bgAccent: "bg-emerald-50",
      iconColor: "text-emerald-600",
      href: "/patient/encounters",
      cta: "View records",
    },
    {
      label: "New Alerts",
      value: unreadCount,
      icon: BellRing,
      badge: unreadCount > 0 ? "Review" : null,
      accent: "from-amber-500 to-orange-600",
      bgAccent: "bg-amber-50",
      iconColor: "text-amber-600",
      href: "/notifications",
      cta: "View notifications",
    },
  ];

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Animated background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-400/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 animate-pulse rounded-full bg-gradient-to-tr from-violet-400/20 to-purple-400/20 blur-3xl" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/25">
                <Heart className="h-3.5 w-3.5" />
                <span>Patient Portal</span>
                <Sparkles className="h-3 w-3" />
              </div>
              <GreetingLine
                name={greetingName}
                className="text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl"
              />
              <p className="mt-2 text-base text-slate-600">
                Your health information, appointments, and care all in one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <NotificationsBell href="/patient/notifications" />
              
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/patient/appointments/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30"
                >
                  <Plus className="h-4 w-4" />
                  Book Appointment
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Enhanced Stat Cards */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-slate-300"
            >
              {/* Gradient accent */}
              <div className={`absolute right-0 top-0 h-32 w-32 bg-gradient-to-br ${stat.accent} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`} />
              
              {/* Content */}
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
                      {stat.trend && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {stat.trend}
                        </span>
                      )}
                      {stat.badge && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          {stat.badge}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-all group-hover:gap-2">
                      {stat.cta}
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                  <div className={`grid h-12 w-12 place-items-center rounded-xl ${stat.bgAccent} ring-1 ring-black/5`}>
                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>

        {/* Quick Health Metrics */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HealthMetric
            icon={Activity}
            label="Last Vitals"
            value="Normal"
            sublabel="3 days ago"
            color="emerald"
          />
          <HealthMetric
            icon={FlaskConical}
            label="Lab Results"
            value="2"
            sublabel="Pending review"
            color="blue"
          />
          <HealthMetric
            icon={Pill}
            label="Prescriptions"
            value="3"
            sublabel="Active medications"
            color="violet"
          />
          <HealthMetric
            icon={Scan}
            label="Imaging"
            value="1"
            sublabel="Report available"
            color="amber"
          />
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <section className="lg:col-span-2 space-y-6">
            {/* Appointments */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <CardHead
                title="My Appointments"
                subtitle={`${upcomingAppts.length} upcoming visit${upcomingAppts.length !== 1 ? 's' : ''}`}
                href="/patient/appointments"
                icon={CalendarRange}
                actionLabel="View all"
              />
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <Th>Provider</Th>
                      <Th>Reason</Th>
                      <Th>Date & Time</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appts.length ? (
                      appts.slice(0, 5).map((a) => (
                        <tr key={a.id} className="group transition hover:bg-slate-50">
                          <Td>
                            <div className="flex items-center gap-2">
                              <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50">
                                <UserRound className="h-5 w-5 text-blue-600" />
                              </div>
                              <span className="font-medium text-slate-900">
                                {a.provider_name || a.provider?.full_name || "Provider"}
                              </span>
                            </div>
                          </Td>
                          <Td>
                            <span className="text-sm text-slate-600">
                              {a.reason || "Consultation"}
                            </span>
                          </Td>
                          <Td>
                            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                              <Clock className="h-3 w-3" />
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
                            title="No appointments scheduled"
                            subtitle="Book your next visit with a healthcare provider."
                            ctaHref="/patient/appointments/new"
                            ctaLabel="Book appointment"
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activity / Notifications */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <CardHead
                title="Recent Updates"
                subtitle="Latest notifications and alerts"
                href="/patient/notifications"
                icon={BellRing}
                actionLabel="View all"
              />
              <ul className="divide-y divide-slate-100">
                {notifList.length ? (
                  notifList.slice(0, 5).map((n, i) => (
                    <li key={n.id || i} className="p-4 transition hover:bg-slate-50">
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-blue-50">
                          <BellRing className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900">
                            {n.title || n.kind || "Notification"}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-600 line-clamp-2">
                            {n.body || n.message || ""}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="p-8 text-center">
                    <p className="text-sm text-slate-500">You're all caught up!</p>
                  </li>
                )}
              </ul>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* HMO SUMMARY CARD*/}
            {patientProfile && <HMOSummaryCard patient={patientProfile} />}

            {/* Quick Actions */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-900">Quick Access</h3>
                </div>
                <p className="mt-1 text-xs text-slate-600">Common actions for patients</p>
              </div>
              <div className="p-4 space-y-2">
                <QuickAction
                  href="/patient/encounters"
                  icon={Activity}
                  label="My Health Records"
                  primary
                />
                <QuickAction
                  href="/patient/vitals"
                  icon={Heart}
                  label="My Vitals"
                />
                <QuickAction
                  href="/patient/documents"
                  icon={Heart}
                  label="My Medical Documents"
                />
                <QuickAction
                  href="/patient/labs"
                  icon={FlaskConical}
                  label="Lab Results"
                />
                <QuickAction
                  href="/patient/imaging"
                  icon={Scan}
                  label="Imaging Tests"
                />
                <QuickAction
                  href="/patient/pharmacy"
                  icon={Pill}
                  label="Prescriptions"
                />
                
                <div className="border-t border-slate-200 pt-2 mt-2">
                  <QuickAction
                    href="/patient/billing"
                    icon={CreditCard}
                    label="Billing & Charges"
                  />
                  <QuickAction
                    href="/patient/payments"
                    icon={CreditCard}
                    label="Payment History"
                  />
                </div>
              </div>
            </div>

            {/* Health Summary Card */}
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm ring-1 ring-emerald-200">
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-white shadow-sm">
                    <Shield className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Health Summary</h3>
                    <p className="text-xs text-emerald-700">Profile complete</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <SummaryItem label="Allergies" value="Updated" status="success" />
                  <SummaryItem label="Medications" value="3 active" status="info" />
                </div>
                <Link
                  href="/patient/allergies"
                  className="mt-4 block w-full rounded-lg bg-white px-4 py-2.5 text-center text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-50"
                >
                  Manage Allergies
                </Link>
              </div>
            </div>

            {/* Settings Cards */}
            <div className="space-y-3">
              <SettingsCard
                href="/settings/profile"
                icon={UserRound}
                title="Profile Settings"
                description="Update your personal information"
              />
              <SettingsCard
                href="/patient/dependents"
                icon={Users}
                title="My Dependents"
                description="Manage family members"
              />
              <SettingsCard
                href="/settings/notifications"
                icon={BellRing}
                title="Notifications"
                description="Manage alert preferences"
              />
            </div>

            {/* Help & Support */}
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm ring-1 ring-blue-200">
              <h3 className="font-semibold text-slate-900">Need Help?</h3>
              <p className="mt-1 text-sm text-slate-600">
                Our support team is here to assist you with any questions.
              </p>
              <Link
                href="/support"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50"
              >
                Contact Support
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ─────────────── UI Components ─────────────── */

function CardHead({ title, subtitle, href, icon: Icon, actionLabel }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-600">{subtitle}</p>}
        </div>
      </div>
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        {actionLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle, ctaHref, ctaLabel }) {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-slate-50">
        <Icon className="h-8 w-8 text-slate-400" />
      </div>
      <div className="font-medium text-slate-900">{title}</div>
      {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
      {ctaHref && ctaLabel && (
        <div className="mt-5">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            {ctaLabel}
          </Link>
        </div>
      )}
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return (
    <td className={`px-4 py-4 text-sm ${className}`}>
      {children}
    </td>
  );
}

function StatusPill({ value }) {
  const v = String(value || "").toUpperCase();
  const configs = {
    SCHEDULED: { bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-300" },
    CHECK_IN: { bg: "bg-blue-100", text: "text-blue-700", ring: "ring-blue-300" },
    COMPLETE: { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-300" },
    CANCELLED: { bg: "bg-rose-100", text: "text-rose-700", ring: "ring-rose-300" },
  };
  const config = configs[v] || configs.SCHEDULED;
  const label = (v || "—").replaceAll("_", " ");
  
  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ${config.bg} ${config.text} ${config.ring}`}>
      {label}
    </span>
  );
}

function QuickAction({ href, icon: Icon, label, primary }) {
  return (
    <Link
      href={href}
      className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
        primary
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl"
          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
      }`}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${primary ? "text-white/70" : "text-slate-400"}`} />
    </Link>
  );
}

function HealthMetric({ icon: Icon, label, value, sublabel, color }) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };
  const colorClasses = colors[color] || colors.blue;
  const [bg, text] = colorClasses.split(" ");

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${bg}`}>
          <Icon className={`h-5 w-5 ${text}`} />
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-900">{value}</div>
          <div className="text-xs text-slate-600">{label}</div>
        </div>
      </div>
      {sublabel && (
        <div className="mt-2 text-xs text-slate-500">{sublabel}</div>
      )}
    </div>
  );
}

function SummaryItem({ label, value, status }) {
  const statusColors = {
    success: "text-emerald-700",
    info: "text-blue-700",
    warning: "text-amber-700",
  };
  
  return (
    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <span className={`text-xs font-semibold ${statusColors[status] || statusColors.info}`}>
        {value}
      </span>
    </div>
  );
}

function SettingsCard({ href, icon: Icon, title, description }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md hover:ring-slate-300"
    >
      <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-slate-50">
        <Icon className="h-5 w-5 text-slate-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-900">{title}</div>
        <div className="text-xs text-slate-600">{description}</div>
      </div>
      <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}