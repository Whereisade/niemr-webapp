// app/provider/page.js
export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  Calendar,
  ClipboardList,
  FlaskConical,
  Pill,
  Users,
  Bell,
  Stethoscope,
  Activity,
  AlertTriangle,
  Clock,
  TrendingUp,
  CheckCircle2,
  User,
  HelpCircle
} from "lucide-react";
import {
  requireIndependentProvider,
  authedFetchJSON,
} from "@/lib/serverAuth";

function normalizeResults(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  // Some routes mistakenly spread arrays into objects with numeric keys
  if (payload && typeof payload === "object") {
    const numericKeys = Object.keys(payload).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) return numericKeys.map((k) => payload[k]);
  }
  return [];
}

function roleLabel(role) {
  switch ((role || "").toUpperCase()) {
    case "DOCTOR":
      return "Doctor";
    case "NURSE":
      return "Nurse";
    case "LAB":
      return "Lab Scientist";
    case "PHARMACY":
      return "Pharmacist";
    default:
      return role || "Provider";
  }
}

function formatDT(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

function formatTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(value);
  }
}

// Extract unique patient count from various data structures
function countUniquePatients(items) {
  const patientIds = new Set();
  items.forEach(item => {
    const patientId = item?.patient?.id || item?.patient_id || item?.patient;
    if (patientId && typeof patientId === 'number') {
      patientIds.add(patientId);
    }
  });
  return patientIds.size;
}

// Slightly richer stat card with subtle motion
function StatCard({ title, value, icon: Icon, href, hint, accent = "blue", badge }) {
  const accentClasses = {
    blue: {
      blob: "from-blue-500/20 via-indigo-500/10 to-sky-400/15",
      iconBg: "bg-blue-50 text-blue-700",
    },
    emerald: {
      blob: "from-emerald-500/20 via-teal-400/10 to-lime-400/15",
      iconBg: "bg-emerald-50 text-emerald-700",
    },
    amber: {
      blob: "from-amber-400/25 via-orange-400/10 to-yellow-300/15",
      iconBg: "bg-amber-50 text-amber-700",
    },
    violet: {
      blob: "from-violet-500/20 via-indigo-500/10 to-fuchsia-400/15",
      iconBg: "bg-violet-50 text-violet-700",
    },
    red: {
      blob: "from-red-500/20 via-rose-400/10 to-pink-400/15",
      iconBg: "bg-red-50 text-red-700",
    },
  }[accent] || {
    blob: "from-blue-500/20 via-indigo-500/10 to-sky-400/15",
    iconBg: "bg-blue-50 text-blue-700",
  };

  const card = (
    <div className="group relative overflow-hidden rounded-2xl bg-white/95 p-4 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
      {/* Accent gradient blob */}
      <div
        className={`pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${accentClasses.blob} blur-2xl transition group-hover:scale-110`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {title}
            </div>
            {badge && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                {badge.text}
              </span>
            )}
          </div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {value}
          </div>
          {hint ? (
            <div className="mt-1 text-[11px] text-slate-500">{hint}</div>
          ) : null}
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${accentClasses.iconBg} transition group-hover:scale-105`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );

  if (!href) return card;

  return (
    <Link href={href} className="block">
      {card}
    </Link>
  );
}

// List card for upcoming work
function ListCard({ title, icon: Icon, items, empty, renderItem, href, subtitle }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-white/95 p-4 shadow-sm ring-1 ring-slate-200">
      {/* Accent gradient strip */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
      <div className="relative pt-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-slate-50 shadow-sm shadow-slate-900/10">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {title}
              </div>
              {subtitle && (
                <p className="text-[11px] text-slate-500">{subtitle}</p>
              )}
            </div>
          </div>
          {href ? (
            <Link
              href={href}
              className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-slate-50 shadow-sm transition hover:bg-slate-800"
            >
              View all
            </Link>
          ) : null}
        </div>

        <div className="space-y-2">
          {items.length ? (
            items.map(renderItem)
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
              {empty}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default async function ProviderPage() {
  const { me, token } = await requireIndependentProvider();
  const role = (me?.role || "").toUpperCase();

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const start = now.toISOString();
  const end = in7Days.toISOString();

  // Notifications (unread) - single source of truth
  const notificationsPayload = await authedFetchJSON(
    token,
    `/notifications/notifications/?read=false&limit=5`,
    null
  );
  const notifications = normalizeResults(notificationsPayload);
  const unreadCount = notifications.length;

  // Provider profile check (best effort)
  const providersPayload = await authedFetchJSON(
    token,
    `/providers/?facility=none&limit=50`,
    null
  );
  const providers = normalizeResults(providersPayload);
  const myProfile = providers.find((p) => {
    const u = p?.user;
    if (typeof u === "number") return u === me?.id;
    return u?.id === me?.id || u?.pk === me?.id;
  });

  // Role-specific data
  let stats = [];
  let primaryList = {
    title: "",
    icon: ClipboardList,
    items: [],
    empty: "",
    href: "",
    subtitle: "",
    renderItem: () => null,
  };
  let secondaryList = null;

  if (role === "LAB") {
    // Fetch lab orders in different states
    const pending = normalizeResults(
      await authedFetchJSON(
        token,
        `/labs/orders/?status=PENDING&limit=20`,
        null
      )
    );
    const inProgress = normalizeResults(
      await authedFetchJSON(
        token,
        `/labs/orders/?status=IN_PROGRESS&limit=20`,
        null
      )
    );
    const completed = normalizeResults(
      await authedFetchJSON(
        token,
        `/labs/orders/?status=COMPLETED&limit=1`,
        null
      )
    );

    // Calculate unique patients
    const allOrders = [...pending, ...inProgress, ...completed];
    const uniquePatients = countUniquePatients(allOrders);

    // Get urgent orders
    const urgentOrders = [...pending, ...inProgress].filter(
      o => (o.priority || '').toUpperCase() === 'URGENT' || (o.priority || '').toUpperCase() === 'STAT'
    );

    stats = [
      {
        title: "Pending orders",
        value: pending.length,
        icon: FlaskConical,
        href: "/provider/labs?status=PENDING",
        accent: "blue",
        hint: urgentOrders.length > 0 ? `${urgentOrders.length} urgent` : "All routine",
      },
      {
        title: "In progress",
        value: inProgress.length,
        icon: Activity,
        href: "/provider/labs?status=IN_PROGRESS",
        accent: "amber",
        hint: "Currently processing",
      },
      {
        title: "Completed today",
        value: completed.length,
        icon: CheckCircle2,
        href: "/provider/labs?status=COMPLETED",
        accent: "emerald",
        hint: "Results ready",
      },
      {
        title: "Active patients",
        value: uniquePatients,
        icon: Users,
        href: "/provider/patients",
        accent: "violet",
        hint: "Based on your lab queue",
      },
    ];

    primaryList = {
      title: "Pending lab orders",
      subtitle: `${pending.length} orders waiting for processing`,
      icon: FlaskConical,
      items: pending.slice(0, 5),
      empty: "No pending lab orders. You're all caught up!",
      href: "/provider/labs",
      renderItem: (o) => {
        const isUrgent = (o.priority || '').toUpperCase() === 'URGENT' || (o.priority || '').toUpperCase() === 'STAT';
        return (
          <Link
            key={o.id}
            href={`/provider/labs/${o.id}`}
            className={`group relative block overflow-hidden rounded-2xl border ${
              isUrgent ? 'border-red-200 bg-red-50/40' : 'border-slate-200 bg-white/90'
            } px-3 py-2.5 text-sm text-slate-800 transition hover:border-blue-200 hover:bg-blue-50/40`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isUrgent && <AlertTriangle className="h-4 w-4 text-red-600" />}
                <span className="font-medium">
                  {o.items?.[0]?.display_name || o.test_type || `Order #${o.id}`}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {formatTime(o.created_at)}
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-600">
              <span>
                Patient:{" "}
                {o.patient_name ||
                  o.patient?.full_name ||
                  o.patient?.name ||
                  "—"}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                isUrgent ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'
              }`}>
                {o.priority || "ROUTINE"}
              </span>
            </div>
          </Link>
        );
      },
    };

    // Secondary list: In-progress orders
    if (inProgress.length > 0) {
      secondaryList = {
        title: "In progress",
        subtitle: `${inProgress.length} orders being processed`,
        icon: Activity,
        items: inProgress.slice(0, 5),
        empty: "",
        href: "/provider/labs?status=IN_PROGRESS",
        renderItem: (o) => (
          <Link
            key={o.id}
            href={`/provider/labs/${o.id}`}
            className="group relative block overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/40 px-3 py-2.5 text-sm text-slate-800 transition hover:border-amber-300"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">
                {o.items?.[0]?.display_name || o.test_type || `Order #${o.id}`}
              </div>
              <div className="text-xs text-slate-500">
                Started: {formatTime(o.collected_at || o.created_at)}
              </div>
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Patient:{" "}
              {o.patient_name ||
                o.patient?.full_name ||
                "—"}
            </div>
          </Link>
        ),
      };
    }
  } else if (role === "PHARMACY") {
    // Fetch prescriptions
    const pendingRx = normalizeResults(
      await authedFetchJSON(
        token,
        `/pharmacy/prescriptions/?status=PRESCRIBED&limit=20`,
        null
      )
    );
    const dispensed = normalizeResults(
      await authedFetchJSON(
        token,
        `/pharmacy/prescriptions/?status=DISPENSED&limit=20`,
        null
      )
    );

    // Calculate unique patients
    const allRx = [...pendingRx, ...dispensed];
    const uniquePatients = countUniquePatients(allRx);

    // Count today's dispensed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dispensedToday = dispensed.filter(rx => {
      const dispensedAt = new Date(rx.dispensed_at || rx.updated_at);
      return dispensedAt >= today;
    });

    stats = [
      {
        title: "To dispense",
        value: pendingRx.length,
        icon: Pill,
        href: "/provider/pharmacy?status=PRESCRIBED",
        accent: "blue",
        hint: "Waiting for pickup",
      },
      {
        title: "Dispensed today",
        value: dispensedToday.length,
        icon: CheckCircle2,
        href: "/provider/pharmacy?status=DISPENSED",
        accent: "emerald",
        hint: "Completed transactions",
      },
      {
        title: "Active patients",
        value: uniquePatients,
        icon: Users,
        href: "/provider/patients",
        accent: "violet",
        hint: "Based on prescriptions",
      },
      {
        title: "Notifications",
        value: unreadCount,
        icon: Bell,
        href: "/provider/notifications",
        accent: "amber",
        badge: unreadCount > 0 ? {
          text: "New",
          className: "bg-amber-100 text-amber-700"
        } : null,
      },
    ];

    primaryList = {
      title: "Prescriptions to dispense",
      subtitle: `${pendingRx.length} medications waiting for pickup`,
      icon: Pill,
      items: pendingRx.slice(0, 5),
      empty: "No prescriptions waiting. All clear!",
      href: "/provider/pharmacy",
      renderItem: (rx) => (
        <Link
          key={rx.id}
          href={`/provider/pharmacy/`}
          className="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-800 transition hover:border-emerald-200 hover:bg-emerald-50/40"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium">
              {rx.items?.[0]?.drug?.name || `Prescription #${rx.id}`}
            </div>
            <div className="text-xs text-slate-500">
              {formatTime(rx.created_at)}
            </div>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              Patient:{" "}
              {rx.patient_name ||
                rx.patient?.full_name ||
                rx.patient?.name ||
                "—"}
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              {rx.quantity || 0} units
            </span>
          </div>
        </Link>
      ),
    };

    // Secondary list: Recently dispensed
    if (dispensedToday.length > 0) {
      secondaryList = {
        title: "Dispensed today",
        subtitle: `${dispensedToday.length} completed transactions`,
        icon: CheckCircle2,
        items: dispensedToday.slice(0, 5),
        empty: "",
        href: "/provider/pharmacy?status=DISPENSED",
        renderItem: (rx) => (
          <Link
            key={rx.id}
            href={`/provider/pharmacy/${rx.id}`}
            className="group relative block overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/40 px-3 py-2.5 text-sm text-slate-800 transition hover:border-emerald-300"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">
                {rx.items?.[0]?.drug?.name || `Prescription #${rx.id}`}
              </div>
              <div className="text-xs text-slate-500">
                {formatTime(rx.dispensed_at)}
              </div>
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Patient: {rx.patient_name || rx.patient?.full_name || "—"}
            </div>
          </Link>
        ),
      };
    }
  } else {
    // Doctor / Nurse dashboard
    const apptSummary = await authedFetchJSON(
      token,
      `/appointments/summary/?date=today&mine=true`,
      null
    );
    const todaysCount =
      apptSummary?.total ??
      apptSummary?.count ??
      apptSummary?.today ??
      0;

    const upcoming = normalizeResults(
      await authedFetchJSON(
        token,
        `/appointments/?mine=true&start=${encodeURIComponent(
          start
        )}&end=${encodeURIComponent(end)}&limit=20`,
        null
      )
    );

    const openEncounters = normalizeResults(
      await authedFetchJSON(
        token,
        `/encounters/?status=OPEN&limit=20`,
        null
      )
    );

    // Calculate unique patients from appointments and encounters
    const allActivity = [...upcoming, ...openEncounters];
    const uniquePatients = countUniquePatients(allActivity);

    // Get today's appointments
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const todaysAppointments = upcoming.filter(a => {
      const startTime = new Date(a.start_at || a.scheduled_for);
      return startTime >= todayStart && startTime <= todayEnd;
    });

    // Count pending encounters (needs completion)
    const pendingEncounters = openEncounters.filter(
      e => (e.status || '').toUpperCase() === 'OPEN'
    );

    stats = [
      {
        title: "Today's appointments",
        value: todaysCount,
        icon: Calendar,
        href: "/provider/appointments?date=today",
        accent: "blue",
        hint: todaysAppointments.length > 0 ? "Active schedule" : "No appointments",
      },
      {
        title: "Open encounters",
        value: pendingEncounters.length,
        icon: ClipboardList,
        href: "/provider/encounters?status=IN_PROGRESS",
        accent: "amber",
        hint: pendingEncounters.length > 0 ? "Needs attention" : "All closed",
      },
      {
        title: "Active patients",
        value: uniquePatients,
        icon: Users,
        href: "/provider/patients",
        accent: "violet",
        hint: "From recent activity",
      },
      {
        title: "Notifications",
        value: unreadCount,
        icon: Bell,
        href: "/provider/notifications",
        accent: unreadCount > 0 ? "red" : "emerald",
        badge: unreadCount > 0 ? {
          text: "New",
          className: "bg-red-100 text-red-700"
        } : null,
      },
    ];

    primaryList = {
      title: "Upcoming appointments",
      subtitle: `Next ${upcoming.length} appointments in the next 7 days`,
      icon: Calendar,
      items: upcoming.slice(0, 5),
      empty: "No upcoming appointments in the next 7 days.",
      href: "/provider/appointments",
      renderItem: (a) => {
        const isToday = todaysAppointments.some(ta => ta.id === a.id);
        return (
          <Link
            key={a.id}
            href={`/provider/appointments/${a.id}`}
            className={`group relative block overflow-hidden rounded-2xl border ${
              isToday ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 bg-white/90'
            } px-3 py-2.5 text-sm text-slate-800 transition hover:border-indigo-200 hover:bg-indigo-50/40`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isToday && <Clock className="h-4 w-4 text-blue-600" />}
                <span className="font-medium">
                  {a.patient_name ||
                    a.patient?.full_name ||
                    `Appointment #${a.id}`}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {formatDT(a.start_at || a.scheduled_for)}
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-600">
              <span>
                Reason: {a.reason || "Consultation"}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                isToday ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
              }`}>
                {a.status || "SCHEDULED"}
              </span>
            </div>
          </Link>
        );
      },
    };

    // Secondary list: Open encounters
    if (pendingEncounters.length > 0) {
      secondaryList = {
        title: "Open encounters",
        subtitle: `${pendingEncounters.length} encounters need completion`,
        icon: ClipboardList,
        items: pendingEncounters.slice(0, 5),
        empty: "",
        href: "/provider/encounters?status=OPEN",
        renderItem: (e) => (
          <Link
            key={e.id}
            href={`/provider/encounters/${e.id}`}
            className="group relative block overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/40 px-3 py-2.5 text-sm text-slate-800 transition hover:border-amber-300"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">
                {e.patient_name ||
                  e.patient?.full_name ||
                  `Encounter #${e.id}`}
              </div>
              <div className="text-xs text-slate-500">
                Started: {formatTime(e.start_time || e.created_at)}
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-600">
              <span>
                Encounter ID: #{e.id}
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                {e.encounter_type || "CONSULT"}
              </span>
            </div>
          </Link>
        ),
      };
    }
  }

  const quickLinks = [
    { href: "/provider/patients", label: "Patients", icon: Users },
    { href: "/settings/profile", label: "Settings", icon: User },
    { href: "/provider/notifications", label: `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`, icon: Bell },
    { href: "/provider/faq", label: "Help", icon: HelpCircle },
  ];

  const displayName =
    me?.first_name || me?.username || "Provider";

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-100/40">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-32 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
        {/* Hero / header card */}
        <section className="relative overflow-hidden rounded-3xl bg-white/95 p-5 shadow-md shadow-blue-500/10 ring-1 ring-slate-200">
          {/* Animated gradient border strip */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />
          {/* Inner gradient wash */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-blue-50/70 via-emerald-50/40 to-transparent" />

          <div className="relative mt-3 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-50 shadow-sm shadow-slate-900/20">
                <Stethoscope className="h-3.5 w-3.5" />
                Independent provider workspace
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                  Welcome back, {displayName}
                </h1>
                <p className="text-sm text-slate-600 md:text-[15px]">
                  Hello,{" "}
                  <span className="font-semibold">
                    {roleLabel(role)}
                  </span>
                  . Keep an eye on today&apos;s work, open items, and
                  recent activity from one place.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {roleLabel(role)}
                </span>
                <span className="text-slate-400">•</span>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                  NIEMR independent provider portal
                </span>
              </div>
            </div>

            {/* Quick buttons cluster */}
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              {quickLinks.map((l, idx) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium shadow-sm transition ${
                    idx === 0
                      ? "bg-slate-900 text-slate-50 hover:bg-slate-800"
                      : "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Profile alert */}
        {!myProfile ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="font-semibold">Heads up:</span> your provider
            profile is not fully set up yet. If you just registered,
            refresh this page. If this persists, complete your profile
            or contact support.
          </div>
        ) : null}

        {/* Stat row */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard
              key={s.title}
              title={s.title}
              value={s.value}
              icon={s.icon}
              href={s.href}
              hint={s.hint}
              accent={s.accent}
              badge={s.badge}
            />
          ))}
        </section>

        {/* Lists: primary workload + secondary (if exists) */}
        <section className={`grid grid-cols-1 gap-5 ${secondaryList ? 'lg:grid-cols-2' : ''}`}>
          <ListCard
            title={primaryList.title}
            subtitle={primaryList.subtitle}
            icon={primaryList.icon}
            items={primaryList.items}
            empty={primaryList.empty}
            href={primaryList.href}
            renderItem={primaryList.renderItem}
          />

          {secondaryList && (
            <ListCard
              title={secondaryList.title}
              subtitle={secondaryList.subtitle}
              icon={secondaryList.icon}
              items={secondaryList.items}
              empty={secondaryList.empty}
              href={secondaryList.href}
              renderItem={secondaryList.renderItem}
            />
          )}
        </section>
      </div>
    </main>
  );
}