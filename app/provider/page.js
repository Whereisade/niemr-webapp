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

// 🔹 Role + provider-type helpers for provider dashboard
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
      return "Lab Scientist Workspace";
    default:
      return "Provider Workspace";
  }
}

function providerSubtitle(providerType) {
  switch (providerType) {
    case "LAB_SCIENTIST":
    case "LAB":
      return "Today’s lab orders and recent updates.";
    case "PHARMACIST":
    case "PHARMACY":
      return "Prescriptions and medication requests at a glance.";
    case "NURSE":
      return "Today’s schedule, observations, and tasks.";
    case "DENTIST":
      return "Dental appointments and procedure pipeline.";
    case "OPTOMETRIST":
      return "Eye-care appointments and clinical worklist.";
    case "PHYSIOTHERAPIST":
      return "Therapy sessions, follow-ups, and progress notes.";
    case "DOCTOR":
    default:
      return "Today’s schedule and recent clinical updates.";
  }
}

function providerPrimaryMetricLabel(providerType) {
  switch (providerType) {
    case "LAB_SCIENTIST":
    case "LAB":
      return "Lab Orders Today";
    case "PHARMACIST":
    case "PHARMACY":
      return "Prescriptions Today";
    case "PHYSIOTHERAPIST":
      return "Sessions Today";
    case "DENTIST":
      return "Dental Appointments Today";
    default:
      return "Appointments Today";
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
    safeFetchJSON("/notifications/items/?since=7d", []),
    safeFetchJSON("/appointments/?date=today&mine=true&limit=10", []),
    safeFetchJSON("/providers/?limit=50", []),
    fetchMe(),
  ]);

  // 🔐 Basic access control
  if (!me) {
    redirect("/login/provider");
  }

  // Backend roles that represent a clinical provider
  if (!PROVIDER_ROLES.includes(me.role)) {
    // If they’re facility staff, push them to facility dashboard instead
    if (me.role !== "PATIENT" && me.facility) {
      redirect("/facility");
    }
    // Otherwise, they shouldn’t be here
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

  const greetingName =
    [me?.first_name, me?.last_name].filter(Boolean).join(" ") ||
    me?.email ||
    "";

  const stats = [
    {
      label: providerPrimaryMetricLabel(providerType),
      value: todaysApptCount,
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
      href: "/notifications",
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
  const licenseCouncil = myProfile?.license_council;
  const licenseNumber = myProfile?.license_number;
  const licenseExpiry = myProfile?.license_expiry;
  const verificationStatus = (myProfile?.verification_status || "PENDING")
    .toString()
    .toUpperCase();
  const verificationLabelMap = {
    APPROVED: "Verified",
    PENDING: "Pending review",
    REJECTED: "Rejected",
  };
  const verificationLabel =
    verificationLabelMap[verificationStatus] || verificationStatus;

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
            {providerDashboardTitle(providerType)}
          </div>
          <GreetingLine
            name={greetingName}
            className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900"
          />
          <p className="mt-1 text-slate-600">
            {providerSubtitle(providerType)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <NotificationsBell href="/provider/notifications" />
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
        </div>
      </header>

      {/* Stat tiles */}
      <section className="mb-8 grid gap-4 md:grid-cols-3">
        {stats.map(
          ({
            label,
            value,
            valueText,
            icon: Icon,
            accent,
            href,
            cta,
            isText,
          }) => (
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
                  <div className="mt-2 text-3xl font-semibold text-slate-900">
                    {value}
                  </div>
                )}
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                  {cta}
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </div>
            </a>
          )
        )}
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
                            {a.patient_name ||
                              a.patient?.full_name ||
                              "Patient"}
                          </span>
                        </div>
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

        {/* Right rail: quick actions + profile + compliance */}
        <aside className="space-y-6">
          {/* Quick actions */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
            <div className="p-5">
              <h3 className="text-slate-900 font-medium">Quick Actions</h3>
              <p className="mt-1 text-sm text-slate-600">
                Start common tasks faster.
              </p>
              <div className="mt-4 grid gap-2">
                <QuickLink
                  href="/encounters/new"
                  icon={Stethoscope}
                  label="New Note"
                />
                <QuickLink href="/labs/new" icon={FileText} label="Order Lab" />
                <QuickLink
                  href="/imaging/new"
                  icon={ClipboardList}
                  label="Request Imaging"
                />
                <QuickLink
                  href="/pharmacy/prescriptions/new"
                  icon={Pill}
                  label="Write e-Rx"
                />

                <Link
                  href="/provider/pharmacy"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  View Prescriptions
                </Link>

                <Link
                  href="/notifications"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Notifications
                </Link>

                <Link
                  href="/provider/billing"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Billing – Charges
                </Link>

                <Link
                  href="/provider/payments"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Billing – Payments
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
                  href="/provider/facility/apply"
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-500 hover:shadow-md"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Apply to a facility
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Join a facility to access patient records and provide
                    </p>
                  </div>
                  <span className="mt-3 text-xs font-medium text-blue-600 group-hover:underline">
                    Apply now
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

          {/* Profile & Verification – now driven by provider profile */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600" />
            <div className="p-5">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50">
                  <ShieldCheck className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-slate-900 font-medium">
                    Profile & Verification
                  </h3>
                  <p className="text-xs text-slate-500">
                    {licenseNumber ? (
                      <>
                        License on file
                        {licenseExpiry && (
                          <>
                            {" · Expires: "}
                            <b>{licenseExpiry}</b>
                          </>
                        )}
                      </>
                    ) : (
                      "License details not complete yet."
                    )}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Role: <b>{typeLabel}</b> · Status: <b>{verificationLabel}</b>
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <span className="rounded-lg border border-slate-200 px-3 py-2">
                  Profile:{" "}
                  <b>
                    {profileCompletion != null ? `${profileCompletion}%` : "—"}
                  </b>
                </span>
                <span className="rounded-lg border border-slate-200 px-3 py-2">
                  e-Rx: <b>Configured</b>
                </span>
                <span className="col-span-3 rounded-lg border border-slate-200 px-3 py-2">
                  Council: <b>{licenseCouncil || "—"}</b> · Specialty:{" "}
                  <b>{specialtiesText || "—"}</b>
                </span>
              </div>
            </div>
          </div>

          {/* Add patient (dummy CTA) */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
            <div className="flex flex-col items-start justify-between gap-4">
              <div>
                <h3 className="text-slate-900 font-semibold">
                  Need to add a patient?
                </h3>
                <p className="text-sm text-slate-600">
                  Create a new patient profile and schedule a first visit.
                </p>
              </div>
              <Link
                href="/patients/self-register"
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
                  You’re all caught up.
                </div>
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
