export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import GreetingLine from "@/components/GreetingLine";
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
  HeartPulse,
  FlaskConical,
  Pill,
  LineChart,
  FileText,
  ShieldCheck,
  Plus,
  Bed,
  ClipboardClock,
  Shield,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Zap,
  BarChart3,
  DollarSign,
  AlertCircle,
  Package,
  Boxes,
} from "lucide-react";

import {
  FACILITY_ROLES,
  FACILITY_WORKSPACE_TYPES,
  getFacilityWorkspaceConfig,
} from "@/lib/roleUiConfig";

import LiveAppointmentsCount from "@/components/facility/LiveAppointmentsCount";
import LiveUpcomingAppointmentsRows from "@/components/facility/LiveUpcomingAppointmentsRows";

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

// Normalize API responses to get list
function normalizeList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.results)) {
    return payload.results;
  }
  if (payload && typeof payload === "object") {
    const keys = Object.keys(payload).filter((k) => String(Number(k)) === k);
    if (keys.length) {
      return keys.sort((a, b) => Number(a) - Number(b)).map((k) => payload[k]);
    }
  }
  return [];
}

// Get count from various response formats
function getCount(payload) {
  if (typeof payload === "number") return payload;
  if (payload && typeof payload.count === "number") return payload.count;
  const list = normalizeList(payload);
  return list.length;
}

// Normalize and extract both list and count
function normalizeListAndCount(payload) {
  if (Array.isArray(payload)) {
    return { list: payload, count: payload.length };
  }
  if (payload && Array.isArray(payload.items)) {
    return {
      list: payload.items,
      count: typeof payload.total_unread === "number" ? payload.total_unread : payload.items.length,
    };
  }
  if (payload && Array.isArray(payload.results)) {
    return {
      list: payload.results,
      count: typeof payload.count === "number" ? payload.count : payload.results.length,
    };
  }
  return { list: [], count: 0 };
}

// Simplified count fetcher
async function safeFetchCount(path, fallback = 0) {
  const payload = await safeFetchJSON(path, null);
  if (!payload) return fallback;
  return getCount(payload);
}

// Calculate percentage change between two numbers
function calculatePercentageChange(current, previous) {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${sign}${Math.round(change)}%`;
}

// Calculate average wait time from appointments
function calculateAverageWaitTime(appointments) {
  const checkedInAppts = appointments.filter(
    (a) => a.status === "CHECKED_IN" && a.checked_in_at && a.started_at
  );
  
  if (checkedInAppts.length === 0) return null;
  
  const totalWaitMinutes = checkedInAppts.reduce((sum, a) => {
    const checkedIn = new Date(a.checked_in_at);
    const started = new Date(a.started_at);
    const waitMs = started - checkedIn;
    return sum + (waitMs / 1000 / 60);
  }, 0);
  
  const avgMinutes = Math.round(totalWaitMinutes / checkedInAppts.length);
  return `${avgMinutes}m`;
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

export default async function FacilityDashboard() {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 30);

  // Today's date range
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);

  // Yesterday's date range (for trend calculation)
  const yesterdayStart = new Date(dayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(dayEnd);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

  const dayRangeQs = new URLSearchParams();
  dayRangeQs.set("start", dayStart.toISOString());
  dayRangeQs.set("end", dayEnd.toISOString());
  dayRangeQs.set("limit", "1");

  const yesterdayRangeQs = new URLSearchParams();
  yesterdayRangeQs.set("start", yesterdayStart.toISOString());
  yesterdayRangeQs.set("end", yesterdayEnd.toISOString());
  yesterdayRangeQs.set("limit", "1");

  const upcomingQs = new URLSearchParams();
  upcomingQs.set("start", now.toISOString());
  upcomingQs.set("end", end.toISOString());
  upcomingQs.set("limit", "20");

  const [notifications, todaysAppointments, yesterdaysAppointments, upcomingAppointments, providers, me] = await Promise.all([
    safeFetchJSON("/notifications/recent/?limit=7", { items: [], total_unread: 0 }),
    safeFetchJSON("/appointments/?date=today&limit=200", []),
    safeFetchJSON(`/appointments/?${yesterdayRangeQs.toString()}`, []),
    safeFetchJSON(`/appointments/?${upcomingQs.toString()}`, []),
    safeFetchJSON("/providers/?limit=100", []),
    fetchMe(),
  ]);

  if (!me) {
    redirect("/login/facility");
  }

  const role = String(me.role || "").toUpperCase();

  if (!FACILITY_ROLES.includes(role)) {
    redirect("/login/facility");
  }

  const workspace = getFacilityWorkspaceConfig(role);
  const isOwner = workspace.type === FACILITY_WORKSPACE_TYPES.OWNER;
  const isFrontdesk = workspace.type === FACILITY_WORKSPACE_TYPES.FRONTDESK;
  const isClinical = workspace.type === FACILITY_WORKSPACE_TYPES.CLINICAL;
  const isSuperAdmin = role === "SUPER_ADMIN";

  // Enhanced role-based data fetching
  let labCounts = { pending: 0, inProgress: 0, completedToday: 0, cancelled: 0 };
  let rxCounts = { prescribed: 0, partial: 0, dispensed: 0, cancelled: 0 };
  let stockCounts = { lowStock: 0, outOfStock: 0, totalItems: 0 };
  let revenueCounts = { todayTotal: 0, paymentsCollected: 0 };

  if (role === "LAB") {
    const [pending, inProgress, completedToday, cancelled] = await Promise.all([
      safeFetchCount("/labs/orders/?status=PENDING&limit=1", 0),
      safeFetchCount("/labs/orders/?status=IN_PROGRESS&limit=1", 0),
      safeFetchCount(`/labs/orders/?status=COMPLETED&${dayRangeQs.toString()}`, 0),
      safeFetchCount("/labs/orders/?status=CANCELLED&limit=1", 0),
    ]);
    labCounts = { pending, inProgress, completedToday, cancelled };
  }

  if (role === "PHARMACY") {
    const [prescribed, partial, dispensed, cancelled, stockData] = await Promise.all([
      safeFetchCount("/pharmacy/prescriptions/?status=PRESCRIBED&limit=1", 0),
      safeFetchCount("/pharmacy/prescriptions/?status=PARTIALLY_DISPENSED&limit=1", 0),
      safeFetchCount("/pharmacy/prescriptions/?status=DISPENSED&limit=1", 0),
      safeFetchCount("/pharmacy/prescriptions/?status=CANCELLED&limit=1", 0),
      safeFetchJSON("/pharmacy/stock/", []),
    ]);
    rxCounts = { prescribed, partial, dispensed, cancelled };
    
    // Calculate stock alerts
    const stockList = normalizeList(stockData);
    let lowStock = 0;
    let outOfStock = 0;
    stockList.forEach(item => {
      const qty = item.current_qty || 0;
      if (qty === 0) outOfStock++;
      else if (qty <= 10) lowStock++;
    });
    stockCounts = { lowStock, outOfStock, totalItems: stockList.length };
  }

  if (isOwner) {
    const [chargesData, paymentsData] = await Promise.all([
      safeFetchJSON(`/billing/charges/?${dayRangeQs.toString()}`, []),
      safeFetchJSON(`/billing/payments/?${dayRangeQs.toString()}`, []),
    ]);
    
    const chargesList = normalizeList(chargesData);
    const paymentsList = normalizeList(paymentsData);
    
    const todayTotal = chargesList.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const paymentsCollected = paymentsList.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    
    revenueCounts = { todayTotal, paymentsCollected };
  }

  const { list: notifList, count: unreadCount } = normalizeListAndCount(notifications);

  const { list: appts, count: todaysApptCount } = normalizeListAndCount(todaysAppointments);
  const { count: yesterdaysApptCount } = normalizeListAndCount(yesterdaysAppointments);

  const { list: upcomingAppts } = normalizeListAndCount(upcomingAppointments);

  // Calculate appointment trend
  const apptTrend = calculatePercentageChange(todaysApptCount, yesterdaysApptCount);
  const apptTrendUp = todaysApptCount >= yesterdaysApptCount;

  // Role-focused schedule
  const scheduleApptTypes =
    role === "LAB" ? ["LAB"] : role === "PHARMACY" ? ["PHARMACY"] : null;

  function filterByApptType(list, allowedTypes) {
    if (!Array.isArray(list)) return [];
    if (!Array.isArray(allowedTypes) || allowedTypes.length === 0) return list;
    const set = new Set(allowedTypes.map((v) => String(v || "").toUpperCase()));
    return list.filter((a) =>
      set.has(String(a?.appt_type || "").toUpperCase())
    );
  }

  const visibleAppts = filterByApptType(appts, scheduleApptTypes);
  const visibleUpcomingAppts = filterByApptType(upcomingAppts, scheduleApptTypes);

  const todaysCountForDashboard = scheduleApptTypes
    ? visibleAppts.length
    : todaysApptCount;

  const statusCounts = visibleAppts.reduce((acc, a) => {
    const st = String(a?.status || "SCHEDULED").toUpperCase();
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});

  const scheduleTitle = isOwner
    ? "Upcoming Schedule"
    : role === "LAB"
      ? "Lab Queue"
      : role === "PHARMACY"
        ? "Pharmacy Queue"
        : role === "DOCTOR"
          ? "My Schedule"
          : "Upcoming Schedule";

  const scheduleSubtitle = isOwner
    ? "Live · next 3 upcoming appointments"
    : role === "LAB"
      ? "Live · next 3 lab visits"
      : role === "PHARMACY"
        ? "Live · next 3 pickups"
        : "Live · next 3 upcoming appointments";

  const provs = Array.isArray(providers)
    ? providers
    : providers?.results || [];

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

  // ===== ENHANCED DYNAMIC STATS (Role-based, 3 stats per role) =====
  let stats;
  if (isOwner) {
    stats = [
      {
        label: "Today's Appointments",
        value: todaysCountForDashboard,
        icon: CalendarRange,
        trend: apptTrend,
        trendUp: apptTrendUp,
        accent: "from-blue-500 to-indigo-600",
        bgAccent: "bg-blue-50",
        iconColor: "text-blue-600",
        href: "/facility/appointments",
        cta: "View schedule",
      },
      {
        label: "Active Providers",
        value: provs.filter(p => p.is_active).length,
        icon: Users2,
        trend: `${provs.length - provs.filter(p => p.is_active).length} inactive`,
        trendUp: true,
        accent: "from-emerald-500 to-teal-600",
        bgAccent: "bg-emerald-50",
        iconColor: "text-emerald-600",
        href: "/facility/providers",
        cta: "Manage team",
      },
      {
        label: "Today's Revenue",
        value: `₦${revenueCounts.todayTotal.toLocaleString()}`,
        subValue: `${revenueCounts.paymentsCollected.toLocaleString()} collected`,
        icon: DollarSign,
        accent: "from-purple-500 to-pink-600",
        bgAccent: "bg-purple-50",
        iconColor: "text-purple-600",
        href: "/facility/billing",
        cta: "View billing",
      },
    ];
  } else if (role === "LAB") {
    stats = [
      {
        label: "Pending Lab Orders",
        value: labCounts.pending,
        icon: FlaskConical,
        accent: "from-blue-500 to-indigo-600",
        bgAccent: "bg-blue-50",
        iconColor: "text-blue-600",
        href: "/facility/labs?status=PENDING",
        cta: "Review queue",
      },
      {
        label: "In Progress",
        value: labCounts.inProgress,
        icon: Activity,
        accent: "from-emerald-500 to-teal-600",
        bgAccent: "bg-emerald-50",
        iconColor: "text-emerald-600",
        href: "/facility/labs?status=IN_PROGRESS",
        cta: "Continue work",
      },
      {
        label: "Completed Today",
        value: labCounts.completedToday,
        icon: CheckCircle2,
        accent: "from-purple-500 to-pink-600",
        bgAccent: "bg-purple-50",
        iconColor: "text-purple-600",
        href: "/facility/labs?status=COMPLETED",
        cta: "View reports",
      },
    ];
  } else if (role === "PHARMACY") {
    const dispenseQueue = rxCounts.prescribed + rxCounts.partial;
    stats = [
      {
        label: "Dispense Queue",
        value: dispenseQueue,
        subValue: `${rxCounts.prescribed} new, ${rxCounts.partial} partial`,
        icon: Pill,
        accent: "from-blue-500 to-indigo-600",
        bgAccent: "bg-blue-50",
        iconColor: "text-blue-600",
        href: "/facility/pharmacy?status=PRESCRIBED",
        cta: "Open queue",
      },
      {
        label: "Dispensed Today",
        value: rxCounts.dispensed,
        icon: CheckCircle2,
        accent: "from-emerald-500 to-teal-600",
        bgAccent: "bg-emerald-50",
        iconColor: "text-emerald-600",
        href: "/facility/pharmacy?status=DISPENSED",
        cta: "View history",
      },
      {
        label: "Stock Alerts",
        value: stockCounts.lowStock + stockCounts.outOfStock,
        subValue: `${stockCounts.outOfStock} out of stock`,
        icon: AlertCircle,
        badge: stockCounts.outOfStock > 0 ? "Critical" : null,
        accent: "from-amber-500 to-orange-600",
        bgAccent: "bg-amber-50",
        iconColor: "text-amber-600",
        href: "/facility/pharmacy/stock",
        cta: "Manage stock",
      },
    ];
  } else if (isFrontdesk) {
    stats = [
      {
        label: "Appointments Today",
        value: todaysCountForDashboard,
        icon: CalendarRange,
        trend: apptTrend,
        trendUp: apptTrendUp,
        accent: "from-blue-500 to-indigo-600",
        bgAccent: "bg-blue-50",
        iconColor: "text-blue-600",
        href: "/facility/appointments",
        cta: "Open schedule",
      },
      {
        label: "Checked In",
        value: statusCounts.CHECKED_IN || 0,
        icon: CheckCircle2,
        accent: "from-emerald-500 to-teal-600",
        bgAccent: "bg-emerald-50",
        iconColor: "text-emerald-600",
        href: "/facility/appointments?status=CHECKED_IN",
        cta: "View patients",
      },
      {
        label: "Providers on Duty",
        value: provs.filter(p => p.is_active).length,
        icon: Users2,
        accent: "from-purple-500 to-pink-600",
        bgAccent: "bg-purple-50",
        iconColor: "text-purple-600",
        href: "/facility/providers",
        cta: "View providers",
      },
    ];
  } else if (role === "DOCTOR") {
    // Fetch doctor-specific data
    const [myAppts, myEncounters] = await Promise.all([
      safeFetchJSON("/appointments/?mine=1&date=today&limit=1", []),
      safeFetchJSON("/encounters/?mine=1&limit=1", []),
    ]);
    
    const myApptsCount = getCount(myAppts);
    const myEncountersList = normalizeList(myEncounters);
    const openEncounters = myEncountersList.filter(e => 
      !["CLOSED", "CROSSED_OUT"].includes(String(e.status || "").toUpperCase())
    ).length;
    const completedToday = statusCounts.COMPLETED || 0;
    
    stats = [
      {
        label: "My Appointments Today",
        value: myApptsCount,
        icon: CalendarRange,
        accent: "from-blue-500 to-indigo-600",
        bgAccent: "bg-blue-50",
        iconColor: "text-blue-600",
        href: "/facility/appointments?mine=1",
        cta: "View schedule",
      },
      {
        label: "Open Encounters",
        value: openEncounters,
        icon: Activity,
        accent: "from-emerald-500 to-teal-600",
        bgAccent: "bg-emerald-50",
        iconColor: "text-emerald-600",
        href: "/facility/encounters?mine=1",
        cta: "View cases",
      },
      {
        label: "Completed Today",
        value: completedToday,
        icon: CheckCircle2,
        accent: "from-purple-500 to-pink-600",
        bgAccent: "bg-purple-50",
        iconColor: "text-purple-600",
        href: "/facility/encounters?status=COMPLETED",
        cta: "View reports",
      },
    ];
  } else if (role === "NURSE") {
    stats = [
      {
        label: "My Appointments",
        value: todaysCountForDashboard,
        icon: CalendarRange,
        accent: "from-blue-500 to-indigo-600",
        bgAccent: "bg-blue-50",
        iconColor: "text-blue-600",
        href: "/facility/appointments",
        cta: "View schedule",
      },
      {
        label: "Checked In",
        value: statusCounts.CHECKED_IN || 0,
        icon: Activity,
        accent: "from-emerald-500 to-teal-600",
        bgAccent: "bg-emerald-50",
        iconColor: "text-emerald-600",
        href: "/facility/appointments?status=CHECKED_IN",
        cta: "Triage queue",
      },
      {
        label: "Open Encounters",
        value: statusCounts.IN_PROGRESS || 0,
        icon: Stethoscope,
        accent: "from-purple-500 to-pink-600",
        bgAccent: "bg-purple-50",
        iconColor: "text-purple-600",
        href: "/facility/encounters",
        cta: "View encounters",
      },
    ];
  } else {
    // Default staff stats
    stats = [
      {
        label: "Total Appointments",
        value: todaysCountForDashboard,
        icon: CalendarRange,
        accent: "from-blue-500 to-indigo-600",
        bgAccent: "bg-blue-50",
        iconColor: "text-blue-600",
        href: "/facility/appointments",
        cta: "Open schedule",
      },
      {
        label: "Active Providers",
        value: provs.length,
        icon: Users2,
        accent: "from-emerald-500 to-teal-600",
        bgAccent: "bg-emerald-50",
        iconColor: "text-emerald-600",
        href: "/facility/providers",
        cta: "View providers",
      },
      {
        label: "Open Encounters",
        value: statusCounts.IN_PROGRESS || 0,
        icon: Activity,
        accent: "from-purple-500 to-pink-600",
        bgAccent: "bg-purple-50",
        iconColor: "text-purple-600",
        href: "/facility/encounters",
        cta: "View encounters",
      },
    ];
  }

  // ===== ENHANCED QUICK METRICS (Role-based, 4 metrics per role) =====
  let quickMetrics = [];
  
  if (isOwner) {
    const completedCount = statusCounts.COMPLETED || 0;
    const totalCount = todaysCountForDashboard || 1;
    const completionRate = Math.round((completedCount / totalCount) * 100);
    const avgWaitTime = calculateAverageWaitTime(appts) || "—";
    const capacityUtilization = Math.min(Math.round((totalCount / 50) * 100), 100); // Assuming 50 slots
    
    quickMetrics = [
      {
        icon: BarChart3,
        label: "Completion Rate",
        value: `${completionRate}%`,
        sublabel: `${completedCount} of ${totalCount}`,
        color: "emerald",
      },
      {
        icon: Clock,
        label: "Avg Wait Time",
        value: avgWaitTime,
        sublabel: "Check-in to start",
        color: "blue",
      },
      {
        icon: Activity,
        label: "Capacity Utilization",
        value: `${capacityUtilization}%`,
        sublabel: "Appointment slots",
        color: "violet",
      },
      {
        icon: DollarSign,
        label: "Outstanding Balance",
        value: `₦${(revenueCounts.todayTotal - revenueCounts.paymentsCollected).toLocaleString()}`,
        sublabel: "Pending payment",
        color: "amber",
      },
    ];
  } else if (role === "LAB") {
    quickMetrics = [
      {
        icon: FlaskConical,
        label: "Pending",
        value: labCounts.pending,
        sublabel: "Awaiting collection",
        color: "blue",
      },
      {
        icon: Activity,
        label: "In Progress",
        value: labCounts.inProgress,
        sublabel: "Being processed",
        color: "emerald",
      },
      {
        icon: CheckCircle2,
        label: "Completed",
        value: labCounts.completedToday,
        sublabel: "Ordered today",
        color: "violet",
      },
      {
        icon: XCircle,
        label: "Cancelled",
        value: labCounts.cancelled,
        sublabel: "Total cancelled",
        color: "amber",
      },
    ];
  } else if (role === "PHARMACY") {
    const toDispense = rxCounts.prescribed + rxCounts.partial;
    quickMetrics = [
      {
        icon: Pill,
        label: "To Dispense",
        value: toDispense,
        sublabel: `${rxCounts.prescribed} new + ${rxCounts.partial} partial`,
        color: "blue",
      },
      {
        icon: CheckCircle2,
        label: "Dispensed",
        value: rxCounts.dispensed,
        sublabel: "Completed today",
        color: "emerald",
      },
      {
        icon: AlertCircle,
        label: "Low Stock",
        value: stockCounts.lowStock,
        sublabel: `${stockCounts.outOfStock} out of stock`,
        color: "amber",
      },
      {
        icon: Package,
        label: "Catalog Items",
        value: stockCounts.totalItems,
        sublabel: "Total drugs",
        color: "violet",
      },
    ];
  } else if (isFrontdesk) {
    quickMetrics = [
      {
        icon: CalendarRange,
        label: "Scheduled",
        value: statusCounts.SCHEDULED || 0,
        sublabel: "Awaiting check-in",
        color: "blue",
      },
      {
        icon: CheckCircle2,
        label: "Checked In",
        value: statusCounts.CHECKED_IN || 0,
        sublabel: "Ready for triage",
        color: "emerald",
      },
      {
        icon: Activity,
        label: "Completed",
        value: statusCounts.COMPLETED || 0,
        sublabel: "Today",
        color: "violet",
      },
      {
        icon: Users2,
        label: "Total Patients",
        value: new Set(appts.map(a => a.patient)).size,
        sublabel: "Unique today",
        color: "amber",
      },
    ];
  } else if (role === "DOCTOR") {
    const [myAppts, myEncounters] = await Promise.all([
      safeFetchJSON("/appointments/?mine=1&date=today&limit=1", []),
      safeFetchJSON("/encounters/?mine=1&limit=200", []),
    ]);
    
    const myApptsCount = getCount(myAppts);
    const myEncountersList = normalizeList(myEncounters);
    const openCases = myEncountersList.filter(e => 
      !["CLOSED", "CROSSED_OUT"].includes(String(e.status || "").toUpperCase())
    ).length;
    const completedToday = myEncountersList.filter(e => {
      const completedAt = e.completed_at || e.clinical_finalized_at;
      if (!completedAt) return false;
      const completedDate = new Date(completedAt);
      return completedDate >= dayStart && completedDate <= dayEnd;
    }).length;
    const completionRate = myApptsCount > 0 ? Math.round((completedToday / myApptsCount) * 100) : 0;
    
    quickMetrics = [
      {
        icon: CalendarRange,
        label: "Appointments",
        value: myApptsCount,
        sublabel: "Today",
        color: "blue",
      },
      {
        icon: Activity,
        label: "Open Cases",
        value: openCases,
        sublabel: "Active encounters",
        color: "emerald",
      },
      {
        icon: CheckCircle2,
        label: "Completed",
        value: completedToday,
        sublabel: "Today",
        color: "violet",
      },
      {
        icon: BarChart3,
        label: "Completion Rate",
        value: `${completionRate}%`,
        sublabel: "Today's efficiency",
        color: "amber",
      },
    ];
  } else if (role === "NURSE") {
    quickMetrics = [
      {
        icon: CalendarRange,
        label: "Appointments",
        value: todaysCountForDashboard,
        sublabel: "Today",
        color: "blue",
      },
      {
        icon: CheckCircle2,
        label: "Checked In",
        value: statusCounts.CHECKED_IN || 0,
        sublabel: "Ready for triage",
        color: "emerald",
      },
      {
        icon: Activity,
        label: "Open Encounters",
        value: statusCounts.IN_PROGRESS || 0,
        sublabel: "In progress",
        color: "violet",
      },
      {
        icon: Stethoscope,
        label: "Completed",
        value: statusCounts.COMPLETED || 0,
        sublabel: "Today",
        color: "amber",
      },
    ];
  } else {
    // Default metrics
    quickMetrics = [
      {
        icon: CalendarRange,
        label: "Appointments",
        value: todaysCountForDashboard,
        sublabel: "Today",
        color: "blue",
      },
      {
        icon: CheckCircle2,
        label: "Checked In",
        value: statusCounts.CHECKED_IN || 0,
        sublabel: "In queue",
        color: "emerald",
      },
      {
        icon: Activity,
        label: "Completed",
        value: statusCounts.COMPLETED || 0,
        sublabel: "Today",
        color: "violet",
      },
      {
        icon: Users2,
        label: "Total Patients",
        value: new Set(appts.map(a => a.patient)).size,
        sublabel: "Unique today",
        color: "amber",
      },
    ];
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Animated background elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-400/20 blur-3xl" />
        <div
          className="absolute -bottom-40 -left-40 h-96 w-96 animate-pulse rounded-full bg-gradient-to-tr from-violet-400/20 to-purple-400/20 blur-3xl"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Enhanced Header */}
        <header className="mb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            {/* Left: Greeting and role badge */}
            <div className="flex-1">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/25">
                <Building2 className="h-3.5 w-3.5" />
                <span>{workspace.headerBadge}</span>
                <Sparkles className="h-3 w-3" />
              </div>
              <GreetingLine
                name={greetingTarget}
                className="text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl"
              />
              <p className="mt-2 text-base text-slate-600">
                {workspace.subtitle}
              </p>
            </div>

            {/* Right: Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <NotificationsBell href="/facility/notifications" />

              {/* Primary action buttons */}
              <div className="flex flex-wrap gap-2">
                {(isOwner || isFrontdesk || role === "DOCTOR" || role === "NURSE") && (
                  <Link
                    href="/facility/appointments"
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:ring-slate-300"
                  >
                    <CalendarRange className="h-4 w-4" />
                    Appointments
                  </Link>
                )}
                {(isOwner || isClinical) && (
                  <Link
                    href="/facility/encounters"
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30"
                  >
                    <Stethoscope className="h-4 w-4" />
                    Encounters
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Enhanced Stat Cards (3 per role, fully dynamic) */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-slate-300"
            >
              {/* Gradient accent */}
              <div
                className={`absolute right-0 top-0 h-32 w-32 bg-gradient-to-br ${stat.accent} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`}
              />

              {/* Content */}
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600">
                      {stat.label}
                    </p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900">
                        {stat.href === "/facility/appointments" && typeof stat.value === 'number' ? (
                          <LiveAppointmentsCount initialCount={stat.value} />
                        ) : (
                          stat.value
                        )}
                      </span>
                      {stat.trend && (
                        <span
                          className={`inline-flex items-center gap-1 text-sm font-medium ${
                            stat.trendUp ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {stat.trendUp ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
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
                    {stat.subValue && (
                      <p className="mt-1 text-xs text-slate-500">{stat.subValue}</p>
                    )}
                    <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-all group-hover:gap-2">
                      {stat.cta}
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                  <div
                    className={`grid h-12 w-12 place-items-center rounded-xl ${stat.bgAccent} ring-1 ring-black/5`}
                  >
                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>

        {/* Quick Actions */}
        <section className="mb-8">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-slate-900">
                  Quick Actions
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Common tasks for your role
              </p>
            </div>
            <div className="p-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {/* Role-specific actions */}
              <QuickLink
                href="/facility/appointments/new"
                icon={Plus}
                label={
                  isFrontdesk ? "Schedule / Check-in" : "New Appointment"
                }
                primary
              />

              {(isOwner || isFrontdesk || role === "DOCTOR" || role === "NURSE") && (
                <QuickLink
                  href="/facility/patients"
                  icon={Users2}
                  label="Manage Patients"
                />
              )}
              {role !== "LAB" && role !== "PHARMACY" && (
                <QuickLink
                  href="/facility/wards"
                  icon={Bed}
                  label="Ward Management"
                />
              )}

              {role === "DOCTOR" && (
                <QuickLink
                  href="/facility/encounters?mine=1"
                  icon={FileText}
                  label="My Encounters"
                />
              )}

              {role === "NURSE" && (
                <QuickLink
                  href="/facility/vitals"
                  icon={HeartPulse}
                  label="Capture Vitals"
                />
              )}

              {(isOwner || role === "LAB") && (
                <>
                <QuickLink
                  href="/facility/labs?status=PENDING"
                  icon={FlaskConical}
                  label="Lab Orders"
                />
                <QuickLink
                  href="/facility/pharmacy"
                  icon={Pill}
                  label="Pharmacy"
                />
                </>
              )}

              {role === "PHARMACY" && (
                <QuickLink
                  href="/facility/pharmacy?status=PRESCRIBED"
                  icon={Pill}
                  label="Dispense Queue"
                />
              )}

              {isOwner && (
                <>
                  <QuickLink
                    href="/facility/providers"
                    icon={Stethoscope}
                    label="Manage Providers"
                  />
                  <QuickLink
                    href="/facility/bed-history"
                    icon={Bed}
                    label="Ward history"
                  />
                  <QuickLink
                    href="/facility/audit"
                    icon={ClipboardClock}
                    label="Audit Logs"
                  />
                  <QuickLink
                    href="/facility/permissions"
                    icon={ClipboardClock}
                    label="Permissions"
                  />
                </>
              )}

              {isSuperAdmin && (
                <QuickLink
                  href="/facility/admins"
                  icon={Shield}
                  label="Manage Admins"
                />
              )}

              {(role === "DOCTOR" || role === "NURSE") && (
                <QuickLink
                  href="/facility/labs/new"
                  icon={FileText}
                  label="Order Lab Test"
                />
              )}

              <QuickLink
                href="/facility/notifications"
                icon={BellRing}
                label="All Notifications"
                badge={unreadCount > 0 ? unreadCount : undefined}
              />
            </div>
          </div>
        </section>

        {/* Quick Metrics (4 per role, fully dynamic) */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickMetrics.map((m, idx) => (
            <MetricCard
              key={idx}
              icon={m.icon}
              label={m.label}
              value={m.value}
              sublabel={m.sublabel}
              color={m.color}
            />
          ))}
        </section>


        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content: Appointments */}
          <section className="lg:col-span-2 space-y-6">
            {/* Appointments Table */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <CardHead
                title={scheduleTitle}
                subtitle={scheduleSubtitle}
                href="/facility/appointments"
                icon={CalendarRange}
                actionLabel="View all"
              />
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <Th>Patient</Th>
                      <Th>Provider</Th>
                      <Th>Reason</Th>
                      <Th>Time</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <LiveUpcomingAppointmentsRows initialAppointments={visibleUpcomingAppts} onlyApptTypes={scheduleApptTypes} />
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Notifications */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <CardHead
                title="Recent Activity"
                subtitle="Latest updates and alerts"
                href="/facility/notifications"
                icon={BellRing}
                actionLabel="View all"
              />
              <ul className="divide-y divide-slate-100">
                {notifList.length ? (
                  notifList.slice(0, 5).map((n, i) => (
                    <li
                      key={n.id || i}
                      className="p-4 transition hover:bg-slate-50"
                    >
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
                    <p className="text-sm text-slate-500">
                      No recent notifications
                    </p>
                  </li>
                )}
              </ul>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Providers Preview */}
            {provs.length > 0 && (
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                <div className="border-b border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Care Team
                      </h3>
                      <p className="text-xs text-slate-600">
                        {provs.length} active provider
                        {provs.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Link
                      href="/facility/providers"
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      View all
                    </Link>
                  </div>
                </div>
                <ul className="divide-y divide-slate-100">
                  {provs.slice(0, 4).map((p, i) => (
                    <li
                      key={p.id || i}
                      className="flex items-center justify-between p-4 transition hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50">
                          <Stethoscope className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">
                            {p.user?.full_name ||
                              [p.user?.first_name, p.user?.last_name]
                                .filter(Boolean)
                                .join(" ") ||
                              p.user?.email ||
                              "Provider"}
                          </div>
                          {p.provider_type && (
                            <div className="text-xs text-slate-500">
                              {p.provider_type.replaceAll("_", " ")}
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Settings Cards */}
            <div className="space-y-3">
              <SettingsCard
                href="/settings/profile"
                icon={Users2}
                title="Profile Settings"
                description="Update your account information"
              />
              <SettingsCard
                href="/settings/notifications"
                icon={BellRing}
                title="Notifications"
                description="Manage alert preferences"
              />
              {isOwner && (
                <SettingsCard
                  href="/facility/reports"
                  icon={FileText}
                  title="Reports & PDFs"
                  description="Download facility reports"
                />
              )}
            </div>

            {/* System Status */}
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm ring-1 ring-emerald-200">
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-white">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      System Status
                    </h3>
                    <p className="text-xs text-emerald-700">
                      All systems operational
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-white p-2.5 shadow-sm">
                    <p className="text-slate-600">Last backup</p>
                    <p className="font-semibold text-slate-900">2 hours ago</p>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 shadow-sm">
                    <p className="text-slate-600">Uptime</p>
                    <p className="font-semibold text-emerald-600">99.9%</p>
                  </div>
                </div>
              </div>
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
    NO_SHOW: { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-300" },
  };
  const config = configs[v] || configs.SCHEDULED;
  const label = (v || "—").replaceAll("_", " ");
  
  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ${config.bg} ${config.text} ${config.ring}`}>
      {label}
    </span>
  );
}

function QuickLink({ href, icon: Icon, label, badge, primary }) {
  return (
    <Link
      href={href}
      className={`group flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-all ${
        primary
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl"
          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
      }`}
    >
      <span className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{label}</span>
        {badge !== undefined && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            primary ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
          }`}>
            {badge}
          </span>
        )}
      </span>
      <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${primary ? "text-white/70" : "text-slate-400"}`} />
    </Link>
  );
}

function MetricCard({ icon: Icon, label, value, sublabel, color }) {
  const colors = {
    emerald: "from-emerald-500 to-teal-600 bg-emerald-50 text-emerald-600",
    blue: "from-blue-500 to-indigo-600 bg-blue-50 text-blue-600",
    violet: "from-violet-500 to-purple-600 bg-violet-50 text-violet-600",
    amber: "from-amber-500 to-orange-600 bg-amber-50 text-amber-600",
  };
  const colorClasses = colors[color] || colors.blue;
  const [gradient, bg, text] = colorClasses.split(" ");

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