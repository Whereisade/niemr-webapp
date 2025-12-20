// components/notifications/NotificationsBell.js
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, Check, ExternalLink, X } from "lucide-react";
import { useRecentNotifications, useUnreadCount } from "@/lib/useNotifications";
import { getPriorityStyle, getTopicLabel, formatTimeAgo } from "@/lib/notifications";

/**
 * Notification bell with dropdown preview.
 *
 * Props:
 *   - href: Link to full notifications page (required)
 *   - pollInterval: Polling interval in ms (default: 30000)
 *   - showDropdown: Whether to show dropdown on click (default: true)
 *   - maxPreviewItems: Max items in dropdown (default: 5)
 */
export default function NotificationsBell({
  href = "/notifications",
  pollInterval = 30000,
  showDropdown = true,
  maxPreviewItems = 5,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { count: unreadCount, urgentCount } = useUnreadCount(pollInterval);
  const {
    items,
    totalUnread,
    isLoading,
    markRead,
  } = useRecentNotifications(maxPreviewItems, pollInterval);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleBellClick = (e) => {
    if (showDropdown) {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const handleMarkRead = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await markRead(id);
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const hasUrgent = urgentCount > 0;
  const displayCount = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={handleBellClick}
        className="relative inline-flex items-center justify-center rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-5 w-5" />

        {/* Badge */}
        {unreadCount > 0 && (
          <span
            className={`absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
              hasUrgent ? "bg-red-500" : "bg-blue-600"
            }`}
          >
            {displayCount}
            {/* Animated ping for urgent */}
            {hasUrgent && (
              <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-75" />
            )}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 origin-top-right rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {totalUnread > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {totalUnread} unread
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading && items.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                Loading...
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                No notifications
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((notification) => (
                  <NotificationPreviewItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onClose={() => setIsOpen(false)}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-3">
            <Link
              href={href}
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all notifications
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Simple link mode (no dropdown) */}
      {!showDropdown && (
        <Link
          href={href}
          className="absolute inset-0"
          aria-label="View notifications"
        />
      )}
    </div>
  );
}

/**
 * Single notification item in the dropdown preview.
 */
function NotificationPreviewItem({ notification, onMarkRead, onClose }) {
  const {
    id,
    title,
    body,
    topic,
    priority,
    is_read,
    created_at,
    action_url,
    time_ago,
  } = notification;

  const priorityStyle = getPriorityStyle(priority);
  const topicLabel = getTopicLabel(topic);
  const timeDisplay = time_ago || formatTimeAgo(created_at);

  const handleClick = () => {
    if (action_url) {
      onClose();
      window.location.href = action_url;
    }
  };

  return (
    <li
      className={`relative px-4 py-3 hover:bg-slate-50 transition-colors ${
        !is_read ? "bg-blue-50/30" : ""
      } ${action_url ? "cursor-pointer" : ""}`}
      onClick={action_url ? handleClick : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Priority indicator */}
        <div className="mt-1.5 flex-shrink-0">
          <span
            className={`block h-2 w-2 rounded-full ${priorityStyle.dot}`}
            title={priority}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-sm font-medium ${
                is_read ? "text-slate-600" : "text-slate-900"
              }`}
            >
              {title || "Notification"}
            </p>
            {!is_read && (
              <button
                type="button"
                onClick={(e) => onMarkRead(e, id)}
                className="flex-shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                title="Mark as read"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {body && (
            <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{body}</p>
          )}

          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
            <span className={`rounded px-1.5 py-0.5 ${priorityStyle.badge}`}>
              {topicLabel}
            </span>
            <span>·</span>
            <span>{timeDisplay}</span>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Simple bell variant - just badge + link, no dropdown.
 */
export function NotificationsBellSimple({ href = "/notifications", pollInterval = 30000 }) {
  const { count: unreadCount, urgentCount } = useUnreadCount(pollInterval);

  const hasUrgent = urgentCount > 0;
  const displayCount = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <Link
      href={href}
      className="relative inline-flex items-center justify-center rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell className="h-5 w-5" />

      {unreadCount > 0 && (
        <span
          className={`absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
            hasUrgent ? "bg-red-500" : "bg-blue-600"
          }`}
        >
          {displayCount}
        </span>
      )}
    </Link>
  );
}

/**
 * Inline bell variant for headers with text label.
 */
export function NotificationsBellInline({ href = "/notifications", pollInterval = 30000 }) {
  const { count: unreadCount, urgentCount, isLoading } = useUnreadCount(pollInterval);

  const hasUrgent = urgentCount > 0;

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700 hover:shadow transition-all"
    >
      <Bell className="h-4 w-4" />
      <span>Notifications</span>

      {isLoading && (
        <span className="text-slate-400">...</span>
      )}

      {!isLoading && unreadCount > 0 && (
        <span
          className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold text-white ${
            hasUrgent ? "bg-red-500" : "bg-blue-600"
          }`}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}