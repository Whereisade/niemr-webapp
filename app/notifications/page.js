// app/notifications/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

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

function buildNotificationTitle(n) {
  return n.title || n.subject || n.heading || n.type || "Notification";
}

function buildNotificationBody(n) {
  return n.message || n.body || n.text || n.description || "";
}

export default function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [updatingId, setUpdatingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "20");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetchNotifications({ page, limit });
        if (cancelled) return;

        setData(res);

        // normalize to array
        let items = [];
        if (Array.isArray(res?.results)) {
          items = res.results;
        } else if (Array.isArray(res)) {
          items = res;
        } else if (res && typeof res === "object") {
          const numericKeys = Object.keys(res).filter((k) => /^\d+$/.test(k));
          if (numericKeys.length) {
            items = numericKeys
              .sort((a, b) => Number(a) - Number(b))
              .map((k) => res[k]);
          }
        }
        setRows(items);
      } catch (err) {
        console.error("Failed to load notifications", err);
        if (!cancelled) {
          setError(
            err?.message ||
              "Failed to load notifications. Please try again."
          );
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [page, limit]);

  const hasNextPage = rows.length === limit;
  const hasPrevPage = page > 1;

  function goToPage(nextPage) {
    const sp = new URLSearchParams(searchParams.toString());
    if (nextPage && nextPage > 1) {
      sp.set("page", String(nextPage));
    } else {
      sp.delete("page");
    }
    router.push(`/notifications?${sp.toString()}`);
  }

  async function handleMarkRead(id) {
    if (!id) return;
    setUpdatingId(id);
    try {
      await markNotificationRead(id);
      // optimistic update
      setRows((prev) =>
        prev.map((n) =>
          n.id === id || String(n.id) === String(id)
            ? {
                ...n,
                is_read: true,
                read_at: n.read_at || new Date().toISOString(),
              }
            : n
        )
      );
    } catch (err) {
      console.error("Failed to mark notification read", err);
      alert(
        err?.message ||
          "Failed to mark notification as read. Please try again."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleMarkAll() {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setRows((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: n.read_at || new Date().toISOString(),
        }))
      );
    } catch (err) {
      console.error("Failed to mark all notifications read", err);
      alert(
        err?.message ||
          "Failed to mark all notifications as read. Please try again."
      );
    } finally {
      setMarkingAll(false);
    }
  }

  const unreadCount = rows.filter((n) => !n.is_read).length;
  const totalCount = Number(data?.count ?? rows.length);

  return (
    <main className="relative mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      {/* Soft background glow */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-52 w-52 rounded-full bg-blue-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-60 w-60 rounded-full bg-indigo-100/70 blur-3xl" />

      {/* Header */}
      <header className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <Bell className="h-3.5 w-3.5" />
            Notification center
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Notifications
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            See important updates about appointments, labs, imaging, billing,
            and other activity related to your account.
          </p>
        </div>

        <button
          type="button"
          onClick={handleMarkAll}
          disabled={markingAll || !rows.length || unreadCount === 0}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {markingAll ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Marking all…
            </>
          ) : (
            <>
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </>
          )}
        </button>
      </header>

      {/* Quick stats */}
      <section className="relative grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
            <Bell className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Unread
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {unreadCount}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50">
            <span className="text-xs font-semibold text-slate-600">All</span>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Total notifications
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {totalCount}
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 shadow-sm sm:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70">
            <Bell className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-xs text-slate-700">
            Unread items are highlighted. Mark as read to keep your inbox tidy.
          </p>
        </div>
      </section>

      {error && (
        <div className="relative flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Notifications list */}
      <section className="relative space-y-2">
        {loading && (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading notifications…</span>
          </div>
        )}

        {!loading && !rows.length && !error && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-sm text-slate-500 shadow-sm">
            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-white">
              <Bell className="h-4 w-4 text-slate-400" />
            </div>
            <p>You don&apos;t have any notifications yet.</p>
          </div>
        )}

        {!loading &&
          rows.map((n) => {
            const isRead = Boolean(n.is_read);
            const title = buildNotificationTitle(n);
            const body = buildNotificationBody(n);

            return (
              <article
                key={n.id}
                className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm transition ${
                  isRead
                    ? "border-slate-100 bg-white"
                    : "border-blue-100 bg-blue-50/70"
                }`}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {!isRead && (
                      <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                    )}
                    <h2 className="text-sm font-semibold text-slate-900">
                      {title}
                    </h2>
                  </div>

                  {body && (
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">
                      {body}
                    </p>
                  )}

                  <p className="text-[11px] text-slate-500">
                    {formatDateTime(
                      n.created_at || n.sent_at || n.timestamp
                    )}
                    {isRead && " · read"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {!isRead && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n.id)}
                      disabled={updatingId === n.id}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updatingId === n.id ? "Marking…" : "Mark as read"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
      </section>

      {/* Pager */}
      <div className="relative flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600">
        <span>
          Page {page} · Showing {rows.length} notification
          {rows.length === 1 ? "" : "s"}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={!hasPrevPage}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Previous
          </button>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={!hasNextPage}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </main>
  );
}
