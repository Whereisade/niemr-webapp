"use client";

import { useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useNotifications } from "@/lib/useNotifications";

function topicLabel(topic) {
  switch (topic) {
    case "LAB_RESULT_READY":
      return "Lab";
    case "IMAGING_REPORT_READY":
      return "Imaging";
    case "APPT_REMINDER":
      return "Appointment";
    case "BILL_CHARGE_ADDED":
      return "Billing (Charge)";
    case "BILL_PAYMENT_POSTED":
      return "Billing (Payment)";
    default:
      return "General";
  }
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

function badgeClass(isRead) {
  return isRead
    ? "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
    : "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700";
}

export default function ProviderNotificationsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(sp.get("page") || 1);
  const limit = Number(sp.get("limit") || 20);
  const unread = sp.get("unread") || "";

  // When unread=true, ask backend for read=false
  const params = useMemo(() => {
    const p = {};
    if (unread === "true") p.read = "false";
    return p;
  }, [unread]);

  const {
    items,
    unreadCount,
    error,
    isLoading,
    markRead,
    markAllRead,
  } = useNotifications(params);

  const total = items.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const pageItems = items.slice(startIndex, endIndex);

  const hasPrev = page > 1;
  const hasNext = endIndex < total;

  const updateQuery = (updates) => {
    const next = new URLSearchParams(sp.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === "" || value === null || value === undefined) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });

    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
    } catch (err) {
      console.error("markAllRead failed", err);
      alert("Failed to mark all as read. Please try again.");
    }
  };

  const handleMarkOne = async (id) => {
    try {
      await markRead(id);
    } catch (err) {
      console.error("markRead failed", err);
      alert("Failed to mark notification as read. Please try again.");
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            You have{" "}
            <span className="font-semibold">{unreadCount} unread</span>{" "}
            notification{unreadCount === 1 ? "" : "s"}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter: All vs Unread */}
          <button
            type="button"
            onClick={() => updateQuery({ unread: "", page: 1 })}
            className={`rounded-full px-3 py-1 text-xs font-medium border ${
              unread !== "true"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => updateQuery({ unread: "true", page: 1 })}
            className={`rounded-full px-3 py-1 text-xs font-medium border ${
              unread === "true"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            Unread only
          </button>

          <div className="hidden h-4 w-px bg-slate-200 md:mx-1 md:block" />

          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={!unreadCount || isLoading}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Mark all as read
          </button>
        </div>
      </header>

      {/* Notifications card */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
          Recent notifications
        </div>

        {error && (
          <div className="border-b border-slate-100 px-4 py-3 text-sm text-red-600">
            Failed to load notifications.
          </div>
        )}

        {isLoading && !pageItems.length ? (
          <div className="px-4 py-6 text-sm text-slate-500">
            Loading notifications…
          </div>
        ) : null}

        {!isLoading && !pageItems.length ? (
          <div className="px-4 py-6 text-sm text-slate-500">
            No notifications to show.
          </div>
        ) : null}

        {pageItems.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {pageItems.map((n) => {
              const isRead = Boolean(n.is_read);
              const topic = n.topic || "GENERAL";
              const created = formatDateTime(n.created_at);
              const body = (n.body || "").trim();

              // Some notifications may carry a deep-link in data.route or data.url
              const route =
                (n.data && (n.data.route || n.data.url)) || null;

              const title =
                n.title ||
                (topic === "LAB_RESULT_READY"
                  ? "Lab result ready"
                  : topic === "IMAGING_REPORT_READY"
                  ? "Imaging report ready"
                  : topic === "APPT_REMINDER"
                  ? "Appointment reminder"
                  : topic === "BILL_CHARGE_ADDED"
                  ? "New bill charge"
                  : topic === "BILL_PAYMENT_POSTED"
                  ? "Payment posted"
                  : "Notification");

              return (
                <li
                  key={n.id}
                  className={`px-4 py-3 text-sm ${
                    !isRead ? "bg-emerald-50/40" : "bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <span className={badgeClass(isRead)}>
                        {isRead ? "Read" : "Unread"}
                      </span>
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-slate-900">
                          {title}
                        </div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-400">
                          {topicLabel(topic)}
                        </div>
                      </div>

                      {body && (
                        <p className="text-sm text-slate-700">{body}</p>
                      )}

                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-slate-500">
                          {created}
                        </div>
                        <div className="flex items-center gap-2">
                          {route ? (
                            <a
                              href={route}
                              className="text-xs font-medium text-blue-600 hover:underline"
                            >
                              Open
                            </a>
                          ) : null}

                          {!isRead && (
                            <button
                              type="button"
                              onClick={() => handleMarkOne(n.id)}
                              className="text-xs font-medium text-slate-700 hover:text-slate-900"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Simple client-side pagination footer */}
        {pageItems.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <div>
              Showing{" "}
              <span className="font-medium">
                {Math.min(startIndex + 1, total)}-
                {Math.min(endIndex, total)}
              </span>{" "}
              of <span className="font-medium">{total}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => hasPrev && updateQuery({ page: page - 1 })}
                disabled={!hasPrev}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => hasNext && updateQuery({ page: page + 1 })}
                disabled={!hasNext}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
