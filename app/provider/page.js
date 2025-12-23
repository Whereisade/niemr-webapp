export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import GreetingLine from "@/components/GreetingLine";
import NotificationsBell from "@/components/notifications/NotificationsBell";
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
  Clock,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Zap,
  FlaskConical,
  Scan,
  CreditCard,
  Award,
  BarChart3,
  Users,
  Target,
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
  if (Array.isArray(payload)) {
    return { list: payload, count: payload.length };
  }
  if (payload && Array.isArray(payload.results)) {
    return {
      list: payload.results,
      count:
        typeof payload.count === "number"
          ? payload.count
          : payload.results.length,
    };
  }
  return { list: [], count: 0 };
}

const PROVIDER_ROLES = ["DOCTOR", "NURSE", "LAB", "PHARMACY"];

const ROLE_TO_PROVIDER_TYPE = {
  DOCTOR: "DOCTOR",
  NURSE: "NURSE",
  LAB: "LAB_SCIENTIST",
  PHARMACY: "PHARMACIST",
};

const PROVIDER_TYPE_LABELS = {
  DOCTOR: "Medical Doctor",
  NURSE: "Nurse",
  PHARMACIST: "Pharmacist",
  LAB_SCIENTIST: "Medical Lab Scientist",
  DENTIST: "Dentist",
  OPTOMETRIST: "Optometrist",
  PHYSIOTHERAPIST: "Physiotherapist",
  OTHER: "Healthcare Provider",
};

function getProviderType(me, profile) {
  if (profile?.provider_type) {
    return profile.provider_type;
  }
  if (me?.role && ROLE_TO_PROVIDER_TYPE[me.role]) {
    return ROLE_TO_PROVIDER_TYPE[me.role];
  }
  return me?.role || "OTHER";
}

function providerDashboardTitle(providerType) {
  switch (providerType) {
    case "DOCTOR":
      return "Doctor Workspace";
    case "DENTIST":
      return "Dentist Workspace";
    case "OPTOMETRIST":
      return "Optometrist Workspace";
    case "PHYSIOTHERAPIST":
      return "Physiotherapist Workspace";
    case "NURSE":
      return "Nurse Workspace";
    case "PHARMACIST":
    case "PHARMACY":
      return "Pharmacy Workspace";
    case "LAB_SCIENTIST":
    case "LAB":
      return "Lab Workspace";
    default:
      return "Provider Workspace";
  }
}

function providerSubtitle(providerType) {
  switch (providerType) {
    case "LAB_SCIENTIST":
    case "LAB":
      return "Process lab orders, manage results, and track sample workflow.";
    case "PHARMACIST":
    case "PHARMACY":
      return "Manage prescriptions, medication dispensing, and patient consultations.";
    case "NURSE":
      return "Coordinate patient care, record vitals, and support clinical workflow.";
    case "DENTIST":
      return "Manage dental procedures, treatment plans, and oral health records.";
    case "OPTOMETRIST":
      return "Provide eye care services, prescriptions, and vision health management.";
    case "PHYSIOTHERAPIST":
      return "Deliver therapy sessions, track progress, and manage rehabilitation plans.";
    case "DOCTOR":
    default:
      return "Deliver comprehensive patient care and clinical excellence.";
  }
}

function computeProfileCompletion(profile) {
  if (!profile) return null;
  const fields = [
    "provider_type",
    "license_number",
    "license_council",
    "license_expiry",
    "years_experience",
    "specialties",
  ];
  let filled = 0;
  let total = fields.length;

  for (const field of fields) {
    if (field === "specialties") {
      if (Array.isArray(profile.specialties) && profile.specialties.length) {
        filled += 1;
      }
    } else if (profile[field]) {
      filled += 1;
    }
  }

  if (!total) return null;
  return Math.round((filled / total) * 100);
}

function mapProviderTypeToLabel(providerType) {
  return PROVIDER_TYPE_LABELS[providerType] || PROVIDER_TYPE_LABELS.OTHER;
}

export default async function ProviderDashboard() {
  const [notifications, myAppointments, providersRaw, me] = await Promise.all([
    safeFetchJSON("/notifications/?limit=10", []),
    safeFetchJSON("/appointments/?date=today&mine=true&limit=10", []),
    safeFetchJSON("/providers/?limit=50", []),
    fetchMe(),
  ]);

  if (!me) {
    redirect("/login/provider");
  }

  if (!PROVIDER_ROLES.includes(me.role)) {
    if (me.role !== "PATIENT" && me.facility) {
      redirect("/facility");
    }
    redirect("/login/provider");
  }

  const notifList = Array.isArray(notifications)
    ? notifications
    : notifications?.results || [];

  const { list: appts, count: todaysApptCount } = normalizeListAndCount(
    myAppointments
  );

  const { list: providersList } = normalizeListAndCount(providersRaw);
  const myProfile =
    providersList.find(
      (p) => p.user && (p.user.id === me.id || p.user.pk === me.id)
    ) || null;

  const providerType = getProviderType(me, myProfile);

  const unreadCount = notifList.filter((n) => {
    if (!n) return false;
    if (typeof n.unread === "boolean") return n.unread;
    if (typeof n.is_read === "boolean") return !n.is_read;
    return !n.read_at;
  }).length;

  const greetingName =
    [me?.first_name, me?.last_name].filter(Boolean).join(" ") ||
    me?.email ||
    "";

  const typeLabel = mapProviderTypeToLabel(providerType);
  const specialtiesText =
    myProfile && Array.isArray(myProfile.specialties)
      ? myProfile.specialties
          .map((s) =>
            typeof s === "string" ? s : s.name || s.title || s.code || ""
          )
          .filter(Boolean)
          .join(", ")
      : "";
  const profileCompletion = computeProfileCompletion(myProfile);
  const verificationStatus = (myProfile?.verification_status || "PENDING")
    .toString()
    .toUpperCase();
  const isVerified = verificationStatus === "APPROVED";

  const stats = [
    {
      label: "Today's Patients",
      value: todaysApptCount,
      icon: Users,
      trend: "+3",
      trendUp: true,
      accent: "from-blue-500 to-indigo-600",
      bgAccent: "bg-blue-50",
      iconColor: "text-blue-600",
      href: "/provider/appointments",
      cta: "View schedule",
    },
    {
      label: "Pending Tasks",
      value: unreadCount,
      icon: Target,
      badge: unreadCount > 0 ? "Action needed" : null,
      accent: "from-amber-500 to-orange-600",
      bgAccent: "bg-amber-50",
      iconColor: "text-amber-600",
      href: "/notifications",
      cta: "Review tasks",
    },
    {
      label: "Completion Rate",
      value: "94%",
      icon: BarChart3,
      trend: "+2%",
      trendUp: true,
      accent: "from-emerald-500 to-teal-600",
      bgAccent: "bg-emerald-50",
      iconColor: "text-emerald-600",
      href: "/provider/encounters",
      cta: "View records",
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
                <Stethoscope className="h-3.5 w-3.5" />
                <span>{providerDashboardTitle(providerType)}</span>
                <Sparkles className="h-3 w-3" />
              </div>
              <GreetingLine
                name={greetingName}
                className="text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl"
              />
              <p className="mt-2 text-base text-slate-600">
                {providerSubtitle(providerType)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <NotificationsBell href="/provider/notifications" />
              
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/provider/encounters"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:ring-slate-300"
                >
                  <Activity className="h-4 w-4" />
                  Encounters
                </Link>
                {/* <Link
                  href="/encounters/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30"
                >
                  <Plus className="h-4 w-4" />
                  New Note
                </Link> */}
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
                        <span className={`inline-flex items-center gap-1 text-sm font-medium ${stat.trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {stat.trendUp ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <></>
                          )}
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

        {/* Performance Metrics */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PerformanceMetric
            icon={Activity}
            label="Completed Today"
            value={appts.filter(a => a.status === 'COMPLETE').length}
            sublabel="Patient visits"
            color="emerald"
          />
          <PerformanceMetric
            icon={Clock}
            label="Avg Note Time"
            value="7m"
            sublabel="Per encounter"
            color="blue"
          />
          <PerformanceMetric
            icon={CheckCircle2}
            label="Orders Placed"
            value="12"
            sublabel="Labs & Imaging"
            color="violet"
          />
          <PerformanceMetric
            icon={Pill}
            label="Prescriptions"
            value="8"
            sublabel="e-Rx written"
            color="amber"
          />
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <section className="lg:col-span-2 space-y-6">
            {/* Appointments */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <CardHead
                title="Today's Schedule"
                subtitle={`${todaysApptCount} appointment${todaysApptCount !== 1 ? 's' : ''} scheduled`}
                href="/provider/appointments"
                icon={CalendarRange}
                actionLabel="View all"
              />
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
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
                        <tr key={a.id} className="group transition hover:bg-slate-50">
                          <Td>
                            <div className="flex items-center gap-2">
                              <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50">
                                <UserRound className="h-5 w-5 text-blue-600" />
                              </div>
                              <span className="font-medium text-slate-900">
                                {a.patient_name || a.patient?.full_name || "Patient"}
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
                            subtitle="Your patient appointments will appear here."
                            ctaHref="/provider/appointments"
                            ctaLabel="View schedule"
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <CardHead
                title="Recent Activity"
                subtitle="Latest updates and notifications"
                href="/provider/notifications"
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
            {/* Quick Actions */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-900">Quick Actions</h3>
                </div>
                <p className="mt-1 text-xs text-slate-600">Common clinical tasks</p>
              </div>
              <div className="p-4 space-y-2">
                <QuickAction
                  href="/encounters/new"
                  icon={Stethoscope}
                  label="New Encounter"
                  primary
                />
                <QuickAction
                  href="/labs/new"
                  icon={FlaskConical}
                  label="Order Lab Test"
                />
                <QuickAction
                  href="/imaging/new"
                  icon={Scan}
                  label="Request Imaging"
                />
                <QuickAction
                  href="/pharmacy/prescriptions/new"
                  icon={Pill}
                  label="Write Prescription"
                />
                
                <div className="border-t border-slate-200 pt-2 mt-2">
                  <QuickAction
                    href="/provider/vitals"
                    icon={Activity}
                    label="View Vitals"
                  />
                  <QuickAction
                    href="/provider/labs"
                    icon={FlaskConical}
                    label="Lab Orders"
                  />
                  <QuickAction
                    href="/provider/pharmacy"
                    icon={Pill}
                    label="Prescriptions"
                  />
                </div>
              </div>
            </div>

            {/* Profile & Credentials */}
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm ring-1 ring-emerald-200">
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className={`grid h-11 w-11 place-items-center rounded-lg ${isVerified ? 'bg-emerald-100' : 'bg-amber-100'} shadow-sm`}>
                    {isVerified ? (
                      <ShieldCheck className="h-6 w-6 text-emerald-600" />
                    ) : (
                      <Award className="h-6 w-6 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">Professional Profile</h3>
                    <p className="text-xs text-slate-600">{typeLabel}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        isVerified 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {isVerified ? "Verified" : "Pending"}
                      </span>
                      {profileCompletion && (
                        <span className="text-xs text-slate-600">
                          {profileCompletion}% complete
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {specialtiesText && (
                  <div className="mt-4 rounded-lg bg-white p-3 shadow-sm">
                    <p className="text-xs font-medium text-slate-600">Specialties</p>
                    <p className="mt-1 text-sm text-slate-900">{specialtiesText}</p>
                  </div>
                )}

                {myProfile?.license_number && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-white p-2 shadow-sm">
                      <p className="text-slate-600">License</p>
                      <p className="font-semibold text-slate-900">
                        {myProfile.license_council || "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white p-2 shadow-sm">
                      <p className="text-slate-600">Expires</p>
                      <p className="font-semibold text-slate-900">
                        {myProfile.license_expiry || "—"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Settings Cards */}
            <div className="space-y-3">
              <SettingsCard
                href="/settings/profile"
                icon={UserRound}
                title="Account Settings"
                description="Update your profile information"
              />
              <SettingsCard
                href="/provider/billing"
                icon={CreditCard}
                title="Billing & Charges"
                description="View charges and payments"
              />
              <SettingsCard
                href="/settings/notifications"
                icon={BellRing}
                title="Notifications"
                description="Manage alert preferences"
              />
            </div>

            {/* Facility Application CTA */}
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm ring-1 ring-blue-200">
              <h3 className="font-semibold text-slate-900">Join a Facility</h3>
              <p className="mt-1 text-sm text-slate-600">
                Apply to work with healthcare facilities and expand your practice.
              </p>
              <Link
                href="/provider/facility/apply"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50"
              >
                <Plus className="h-4 w-4" />
                Apply Now
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

function PerformanceMetric({ icon: Icon, label, value, sublabel, color }) {
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