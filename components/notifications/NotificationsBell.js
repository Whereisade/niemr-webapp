"use client";

import Link from "next/link";
import { useNotifications } from "@/lib/useNotifications";

/**
 * Small header bell that shows unread count and links to a notifications page.
 *
 * Usage:
 *   <NotificationsBell href="/provider/notifications" />
 */
export default function NotificationsBell({ href }) {
  const { unreadCount, isLoading, error } = useNotifications({
    read: "false",
  });

  // Normalize states
  const showBadge = !error && !isLoading && unreadCount > 0;

  return (
    <Link
      href={href}
      className="relative inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
      aria-label={`Notifications${showBadge ? ` (${unreadCount} unread)` : ""}`}
    >
      {/* Simple bell icon (no external dependencies) */}
      <span className="mr-1.5 text-base" aria-hidden="true">
        🔔
      </span>

      <span className="hidden sm:inline">
        Notifications
      </span>

      {isLoading && !error && (
        <span className="ml-1 text-[11px] text-slate-400">
          …
        </span>
      )}

      {showBadge && (
        <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-semibold leading-tight text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
