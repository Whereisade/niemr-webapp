// app/notifications/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications";

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

function isUnread(n) {
  if (typeof n.is_read === "boolean") return !n.is_read;
  if (n.read_at) return false;
  return true;
}

export default function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [markingOne, setMarkingOne] = useState(null);

  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "20");
  const unreadFilter = searchParams.get("unread"); // "true" | "false" | null

  const unreadOnly =
    unreadFilter === "true" ? true : unreadFilter === "false" ? false : null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetchNotifications({
          page,
          limit,
          unread: unreadOnly,
        });

        if (cancelled) return;

        setData(res);

        let items = [];
        if (Array.isArray(res?.results)) {
          items = res.results;
        } else if (Array.isArray(res)) {
          items = res;
        } else if (res && typeof res === "object") {
          const numericKeys = Object.keys(res).filter((k) =>
            /^\d+$/.test(k)
          );
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
  }, [page, limit, unreadOnly]);

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

  function applyUnreadFilter(value) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      sp.delete("unread");
    } else if (value === "unread") {
      sp.set("unread", "true");
    } else if (value === "read") {
      sp.set("unread", "false");
    }
    sp.delete("page");
    router.push(`/notifications?${sp.toString()}`);
  }

  async function handleMarkRead(id) {
    if (!id) return;

    try {
      setMarkingOne(id);
      await markNotificationRead(id);

      setRows((prev) =>
        prev.map((n) =>
          String(n.id) === String(id)
            ? {
                ...n,
                is_read: true,
                read_at: n.read_at || new Date().toISOString(),
              }
            : n
        )
      );
    } catch (err) {
      console.error("Failed to mark notification as read", err);
      alert(
        err?.message ||
          "Failed to mark notification as read. Please try again."
      );
    } finally {
      setMarkingOne(null);
    }
  }

  async function handleMarkAllRead() {
    try {
      setMarkingAll(true);
      await markAllNotificationsRead();

      setRows((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: n.read_at || new Date().toISOString(),
        }))
      );
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
      alert(
        err?.message ||
          "Failed to mark all notifications as read. Please try again."
      );
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            See alerts about appointments, lab results, imaging reports,
            prescriptions, and billing activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={
              unreadOnly === true
                ? "unread"
                : unreadOnly === false
                ? "read"
                : "all"
            }
            onChange={(e) => applyUnreadFilter(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All</option>
            <option value="unread">Unread only</option>
            <option value="read">Read only</option>
          </select>

          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markingAll || !rows.some((n) => isUnread(n))}
            className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {markingAll ? "Marking…" : "Mark all as read"}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  When
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Title
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Message
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-4 text-center text-sm text-slate-500"
                  >
                    Loading notifications…
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((n) => {
                  const unread = isUnread(n);
                  const title =
                    n.title || n.subject || n.heading || "—";
                  const message =
                    n.body || n.message || n.text || "—";

                  return (
                    <tr
                      key={n.id}
                      className={
                        unread ? "bg-slate-50 hover:bg-slate-100" : "hover:bg-slate-50"
                      }
                    >
                      <td className="p-3 text-xs text-slate-800">
                        {formatDateTime(
                          n.created_at || n.timestamp || n.sent_at
                        )}
                      </td>
                      <td className="p-3 text-sm font-medium text-slate-900">
                        {title}
                      </td>
                      <td className="p-3 text-xs text-slate-800">
                        <span className="line-clamp-3">{message}</span>
                      </td>
                      <td className="p-3 text-xs text-slate-800">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            unread
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-50 text-slate-600"
                          }`}
                        >
                          {unread ? "Unread" : "Read"}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-800">
                        <div className="flex flex-wrap gap-2">
                          {unread && (
                            <button
                              type="button"
                              onClick={() => handleMarkRead(n.id)}
                              disabled={markingOne === n.id}
                              className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {markingOne === n.id
                                ? "Marking…"
                                : "Mark as read"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {!loading && !rows.length && !error && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-4 text-center text-sm text-slate-500"
                  >
                    No notifications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-600">
          <span>
            Page {page} · Showing {rows.length} notification
            {rows.length === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={!hasPrevPage}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={!hasNextPage}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
