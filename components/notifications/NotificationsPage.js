// components/notifications/NotificationsPage.js
"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Archive,
  Trash2,
  Filter,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArchiveRestore,
} from "lucide-react";
import { useNotifications } from "@/lib/useNotifications";
import {
  getPriorityStyle,
  getTopicLabel,
  formatTimeAgo,
  PRIORITY_COLORS,
  TOPIC_LABELS,
} from "@/lib/notifications";

/**
 * Reusable notifications page component with filtering, batch actions, and pagination.
 *
 * Props:
 *   - title: Page title
 *   - subtitle: Page subtitle
 *   - showStats: Show stats dashboard
 *   - showArchived: Allow viewing archived
 *   - allowBatchActions: Enable batch selection and actions
 *   - pollInterval: Polling interval in ms
 *   - defaultLimit: Items per page
 */
export default function NotificationsPage({
  title = "Notifications",
  subtitle = "Stay updated on important activities",
  showStats = true,
  showArchived = true,
  allowBatchActions = true,
  pollInterval = 30000,
  defaultLimit = 20,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL-based state
  const page = Number(searchParams.get("page") || 1);
  const archived = searchParams.get("archived") === "true";
  const readFilter = searchParams.get("read");
  const priorityFilter = searchParams.get("priority") || "";
  const topicFilter = searchParams.get("topic") || "";
  const searchQuery = searchParams.get("search") || "";

  // Local state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Build query params
  const queryParams = useMemo(() => {
    const params = {
      page,
      limit: defaultLimit,
      archived,
    };

    if (readFilter === "true") params.read = true;
    if (readFilter === "false") params.read = false;
    if (priorityFilter) params.priority = priorityFilter;
    if (topicFilter) params.topic = topicFilter;
    if (searchQuery) params.search = searchQuery;

    return params;
  }, [page, archived, readFilter, priorityFilter, topicFilter, searchQuery, defaultLimit]);

  // Fetch data
  const {
    items,
    pagination,
    stats,
    unreadCount,
    urgentCount,
    error,
    isLoading,
    markRead,
    markUnread,
    archive,
    unarchive,
    markAllRead,
    archiveAllRead,
    batchRead,
    batchArchive,
    batchDelete,
    mutate,
  } = useNotifications(queryParams, { pollInterval, fetchStats: showStats });

  // URL update helper
  const updateQuery = useCallback(
    (updates) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === "" || value === null || value === undefined) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      // Reset to page 1 when filters change
      if (!("page" in updates)) {
        params.delete("page");
      }

      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams]
  );

  // Selection handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((n) => n.id)));
    }
  }, [items, selectedIds.size]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Batch action handlers
  const handleBatchRead = async () => {
    if (selectedIds.size === 0) return;
    try {
      await batchRead(Array.from(selectedIds));
      setSelectedIds(new Set());
    } catch (err) {
      alert("Failed to mark as read. Please try again.");
    }
  };

  const handleBatchArchive = async () => {
    if (selectedIds.size === 0) return;
    try {
      await batchArchive(Array.from(selectedIds));
      setSelectedIds(new Set());
    } catch (err) {
      alert("Failed to archive. Please try again.");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} notification(s)? This cannot be undone.`)) {
      return;
    }
    try {
      await batchDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    } catch (err) {
      alert("Failed to delete. Please try again.");
    }
  };

  // Single item handlers
  const handleMarkRead = async (id) => {
    try {
      await markRead(id);
    } catch (err) {
      alert("Failed to mark as read.");
    }
  };

  const handleMarkUnread = async (id) => {
    try {
      await markUnread(id);
    } catch (err) {
      alert("Failed to mark as unread.");
    }
  };

  const handleArchive = async (id) => {
    try {
      await archive(id);
    } catch (err) {
      alert("Failed to archive.");
    }
  };

  const handleUnarchive = async (id) => {
    try {
      await unarchive(id);
    } catch (err) {
      alert("Failed to unarchive.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
    } catch (err) {
      alert("Failed to mark all as read.");
    }
  };

  const handleArchiveAllRead = async () => {
    if (!confirm("Archive all read notifications?")) return;
    try {
      await archiveAllRead();
    } catch (err) {
      alert("Failed to archive.");
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateQuery({ search: localSearch });
  };

  // Pagination
  const totalPages = Math.ceil((pagination.count || 0) / defaultLimit);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // Priority options for filter
  const priorityOptions = [
    { value: "", label: "All priorities" },
    { value: "URGENT", label: "Urgent" },
    { value: "HIGH", label: "High" },
    { value: "NORMAL", label: "Normal" },
    { value: "LOW", label: "Low" },
  ];

  // Topic options for filter
  const topicOptions = [
    { value: "", label: "All topics" },
    ...Object.entries(TOPIC_LABELS).map(([value, label]) => ({ value, label })),
  ];

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const hasSelection = selectedIds.size > 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {title}
            </h1>
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                showFilters
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
            </button>

            {/* Archive toggle */}
            {showArchived && (
              <button
                type="button"
                onClick={() => updateQuery({ archived: archived ? "" : "true" })}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  archived
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Archive className="h-3.5 w-3.5" />
                {archived ? "Viewing archived" : "Show archived"}
              </button>
            )}

            {/* Mark all read */}
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || isLoading}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          </div>
        </div>

        {/* Stats row */}
        {showStats && stats && (
          <div className="mt-4 flex flex-wrap gap-3">
            <StatBadge label="Total" value={stats.total || 0} />
            <StatBadge
              label="Unread"
              value={stats.unread || 0}
              highlight={stats.unread > 0}
            />
            {urgentCount > 0 && (
              <StatBadge label="Urgent" value={urgentCount} variant="danger" />
            )}
            <StatBadge label="Archived" value={stats.archived || 0} variant="muted" />
          </div>
        )}
      </header>

      {/* Filters panel */}
      {showFilters && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex-1 min-w-48">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  placeholder="Search notifications..."
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </form>

            {/* Read status */}
            <div className="min-w-32">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Status
              </label>
              <select
                value={readFilter || ""}
                onChange={(e) => updateQuery({ read: e.target.value })}
                className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">All</option>
                <option value="false">Unread</option>
                <option value="true">Read</option>
              </select>
            </div>

            {/* Priority */}
            <div className="min-w-32">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => updateQuery({ priority: e.target.value })}
                className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                {priorityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic */}
            <div className="min-w-40">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Topic
              </label>
              <select
                value={topicFilter}
                onChange={(e) => updateQuery({ topic: e.target.value })}
                className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                {topicOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear filters */}
            <button
              type="button"
              onClick={() => {
                setLocalSearch("");
                updateQuery({
                  search: "",
                  read: "",
                  priority: "",
                  topic: "",
                });
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Batch actions bar */}
      {allowBatchActions && hasSelection && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
          <span className="text-sm font-medium text-blue-700">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleBatchRead}
              className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Check className="h-3.5 w-3.5" />
              Mark read
            </button>
            <button
              type="button"
              onClick={handleBatchArchive}
              className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Archive className="h-3.5 w-3.5" />
              Archive
            </button>
            <button
              type="button"
              onClick={handleBatchDelete}
              className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-blue-600 hover:text-blue-700"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Notifications list */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* List header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-3">
            {allowBatchActions && items.length > 0 && (
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            )}
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {archived ? "Archived notifications" : "Recent notifications"}
            </span>
          </div>

          {!archived && unreadCount > 0 && (
            <button
              type="button"
              onClick={handleArchiveAllRead}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Archive all read
            </button>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            Failed to load notifications. Please try again.
          </div>
        )}

        {/* Loading state */}
        {isLoading && items.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            Loading notifications...
          </div>
        )}

        {/* Empty state */}
        {!isLoading && items.length === 0 && !error && (
          <div className="px-4 py-8 text-center">
            <Bell className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">
              {archived
                ? "No archived notifications"
                : "No notifications to show"}
            </p>
          </div>
        )}

        {/* Notifications list */}
        {items.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                isSelected={selectedIds.has(notification.id)}
                onToggleSelect={() => toggleSelect(notification.id)}
                onMarkRead={() => handleMarkRead(notification.id)}
                onMarkUnread={() => handleMarkUnread(notification.id)}
                onArchive={() => handleArchive(notification.id)}
                onUnarchive={() => handleUnarchive(notification.id)}
                allowSelection={allowBatchActions}
                isArchived={archived}
              />
            ))}
          </ul>
        )}

        {/* Pagination */}
        {items.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages || 1} · {pagination.count || 0} total
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => hasPrev && updateQuery({ page: page - 1 })}
                disabled={!hasPrev}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => hasNext && updateQuery({ page: page + 1 })}
                disabled={!hasNext}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

/**
 * Single notification item in the list.
 */
function NotificationItem({
  notification,
  isSelected,
  onToggleSelect,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onUnarchive,
  allowSelection,
  isArchived,
}) {
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
    is_expired,
  } = notification;

  const priorityStyle = getPriorityStyle(priority);
  const topicLabel = getTopicLabel(topic);
  const timeDisplay = time_ago || formatTimeAgo(created_at);

  return (
    <li
      className={`relative px-4 py-4 transition-colors ${
        !is_read && !isArchived ? "bg-blue-50/30" : "bg-white"
      } ${isSelected ? "bg-blue-50" : ""} hover:bg-slate-50`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        {allowSelection && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
        )}

        {/* Priority indicator */}
        <div className="mt-1.5 flex-shrink-0">
          <span
            className={`block h-2.5 w-2.5 rounded-full ${priorityStyle.dot}`}
            title={priority}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-medium ${
                  is_read ? "text-slate-600" : "text-slate-900"
                } ${is_expired ? "line-through opacity-60" : ""}`}
              >
                {title || "Notification"}
              </p>
              {body && (
                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{body}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {!isArchived && (
                <>
                  {is_read ? (
                    <button
                      type="button"
                      onClick={onMarkUnread}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Mark as unread"
                    >
                      <span className="sr-only">Mark unread</span>
                      <div className="h-4 w-4 rounded-full border-2 border-current" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onMarkRead}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onArchive}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="Archive"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </>
              )}

              {isArchived && (
                <button
                  type="button"
                  onClick={onUnarchive}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title="Unarchive"
                >
                  <ArchiveRestore className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded px-1.5 py-0.5 ${priorityStyle.badge}`}>
              {topicLabel}
            </span>
            {priority !== "NORMAL" && (
              <span className={`rounded px-1.5 py-0.5 ${priorityStyle.badge}`}>
                {priority}
              </span>
            )}
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">{timeDisplay}</span>

            {action_url && (
              <>
                <span className="text-slate-400">·</span>
                <a
                  href={action_url}
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  Open
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Stat badge component.
 */
function StatBadge({ label, value, highlight = false, variant = "default" }) {
  const baseClass =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium";

  const variantClasses = {
    default: highlight
      ? "bg-blue-100 text-blue-700"
      : "bg-slate-100 text-slate-600",
    danger: "bg-red-100 text-red-700",
    muted: "bg-slate-100 text-slate-500",
  };

  return (
    <span className={`${baseClass} ${variantClasses[variant]}`}>
      {label}: <span className="font-semibold">{value}</span>
    </span>
  );
}