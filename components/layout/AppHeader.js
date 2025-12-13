"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Shield,
  Home,
  LogIn,
  UserPlus,
  Menu,
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  CalendarClock,
  FlaskConical,
  CreditCard,
} from "lucide-react";

import LogoutButton from "@/components/LogoutButton";

const STAFF_ROLES = [
  "ADMIN",
  "SUPER_ADMIN",
  "DOCTOR",
  "NURSE",
  "LAB",
  "PHARMACY",
  "FRONTDESK",
];

// 🔹 Clinical provider roles (with or without facility)
const PROVIDER_ROLES = ["DOCTOR", "NURSE", "LAB", "PHARMACY"];

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function formatRole(role) {
  if (!role) return "";
  return role
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Decide which nav items to show based on user role + facility
function buildNavForUser(user) {
  if (!user) {
    // Guest
    return [
      { href: "/", label: "Home", icon: Home },
      { href: "/login", label: "Login", icon: LogIn },
      { href: "/register", label: "Register", icon: UserPlus, accent: true },
    ];
  }

  // Patient portal
  if (user.role === "PATIENT") {
    return [
      { href: "/patient", label: "Overview", icon: LayoutDashboard },
      {
        href: "/patient/appointments",
        label: "Appointments",
        icon: CalendarClock,
      },
      { href: "/patient/labs", label: "Labs", icon: FlaskConical },
      { href: "/patient/billing", label: "Billing", icon: CreditCard },
    ];
  }

  const hasFacility = !!user.facility;

  // Facility staff (Super admin, admin, clinical or frontdesk WITH facility)
  if (hasFacility && STAFF_ROLES.includes(user.role)) {
    return [
      { href: "/facility", label: "Facility", icon: LayoutDashboard },
      {
        href: "/facility/appointments",
        label: "Appointments",
        icon: CalendarClock,
      },
      { href: "/facility/labs", label: "Labs", icon: FlaskConical },
      { href: "/facility/billing", label: "Billing", icon: CreditCard },
    ];
  }

  // Independent providers (no facility, but clinical provider role)
  if (!hasFacility && PROVIDER_ROLES.includes(user.role)) {
    return [
      { href: "/provider", label: "Worklist", icon: LayoutDashboard },
      {
        href: "/provider/appointments",
        label: "Appointments",
        icon: CalendarClock,
      },
      { href: "/provider/labs", label: "Labs", icon: FlaskConical },
    ];
  }

  // Fallback
  return [{ href: "/", label: "Home", icon: Home }];
}

export default function AppHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchUser() {
      try {
        const res = await fetch("/api/proxy/accounts/me/", {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          setUser(data || null);
        }
      } catch (err) {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingUser(false);
        }
      }
    }

    fetchUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const navItems = buildNavForUser(user);
  const isAuthed = !!user;

  const displayName = (() => {
    if (!user) return null;
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    return user.email || "User";
  })();

  const roleLabel = user?.role ? formatRole(user.role) : null;

  const isActive = (href) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="group inline-flex items-center gap-3">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
            <Activity className="h-5 w-5" />
            <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-emerald-400" />
          </span>
          <span className="font-semibold text-xl tracking-tight group-hover:text-blue-700 transition-colors">
            NIEMR
          </span>
          <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
            <Shield className="h-3 w-3" />
            Secure
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-4 text-sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            const baseClasses = item.accent
              ? "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700 transition-colors"
              : "inline-flex items-center gap-2 text-slate-700 hover:text-blue-700 transition-colors";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={classNames(baseClasses, active && "text-blue-700")}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{item.label}</span>
                {item.accent && <ArrowRight className="ml-1 h-4 w-4" />}
              </Link>
            );
          })}

          {/* Right side: user chip + logout when logged in */}
          {isAuthed && (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                <div className="h-7 w-7 flex items-center justify-center rounded-full bg-blue-600/10 text-[10px] font-semibold uppercase text-blue-700">
                  {(displayName || "U")
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="text-xs">
                  <div className="font-medium text-slate-900">
                    {displayName}
                  </div>
                  {roleLabel && (
                    <div className="text-[10px] text-slate-500">
                      {roleLabel}
                    </div>
                  )}
                </div>
              </div>
              <LogoutButton />
            </div>
          )}
        </nav>

        {/* Mobile nav */}
        <details className="md:hidden relative">
          <summary className="list-none inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm hover:border-blue-200 cursor-pointer">
            <Menu className="h-5 w-5 text-slate-700" />
            <span className="sr-only">Open menu</span>
          </summary>

          <div
            className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
            role="menu"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={classNames(
                    "flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50",
                    active && "bg-slate-50 text-blue-700"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {isAuthed && (
              <div className="border-t border-slate-100 px-4 py-2.5">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                  <div>
                    <div className="font-medium text-slate-900">
                      {displayName}
                    </div>
                    {roleLabel && (
                      <div className="text-[10px]">{roleLabel}</div>
                    )}
                  </div>
                  <LogoutButton />
                </div>
              </div>
            )}
          </div>
        </details>
      </div>

      {/* Accent rule */}
      <div className="h-px bg-gradient-to-r from-blue-600/20 via-slate-200 to-transparent" />
    </header>
  );
}
