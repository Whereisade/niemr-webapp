// components/notifications/NotificationsBell.js
"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useUnreadNotificationsCount } from "@/lib/useUnreadNotificationsCount";

/**
 * Small header bell that shows unread count and links to a notifications page.
 *
 * Usage:
 *   <NotificationsBell href="/provider/notifications" />
 *   <NotificationsBell href="/facility/notifications" />
 *   <NotificationsBell href="/patient/notifications" />
 */
export default function NotificationsBell({ href }) {
  const { count, loading, error } = useUnreadNotificationsCount();

  const unreadCount =
    typeof count === "number" && count > 0 ? count : 0;

  const showBadge = unreadCount > 0 && !error;

  return (
    <Link
      href={href || "/notifications"}
      className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700 hover:shadow transition-all"
    >
      <span className="relative mr-1 flex h-5 w-5 items-center justify-center">
        <Bell className="h-4 w-4" />
      </span>

      <span>Notifications</span>

      {loading && !error && (
        <span className="ml-1 text-[11px] text-slate-400">…</span>
      )}

      {showBadge && (
        <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-semibold leading-tight text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
