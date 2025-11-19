"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useNotifications } from "@/lib/useNotifications";
import {
  BellRing,
  Inbox,
  Eye,
  EyeOff,
  Clock,
  ArrowLeft,
  ArrowRight,
  Filter,
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

function isNotificationRead(n) {
  return Boolean(n.is_read ?? n.read);
}

export default function ProviderNotificationsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(sp.get("page") || 1);
  const limit = Number(sp.get("limit") || 20);
  const unread = sp.get("unread") || "";

  const { data, error, isLoading } = useNotifications({
    page,
    limit,
    unread: unread === "true" ? "true" : "",
  });

  const rows = Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data)
    ? data
    : [];
  const total = Number(data?.count ?? rows.length);

  const unreadCount = rows.filter((n) => !isNotificationRead(n)).length;
  const readCount = rows.length - unreadCount;
  const latestTs = rows[0]?.created_at || rows[0]?.timestamp;

  const updateQuery = (patch) => {
    const params = new URLSearchParams(sp?.toString() || "");
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") {
        params.delete(k);
      } else {
        params.set(k, String(v));
      }
    });
    if ("unread" in patch || "limit" in patch) {
      params.set("page", "1");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  if (isLoading && !data) {
    return (
      <main className="mx-auto max-w-5xl p-6 md:p-10">
        <h1 className="mb-4 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          Notifications
        </h1>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="-mt-6 mb-4 h-1.5 w-full rounded-t-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
          <p className="text-sm text-slate-500">Loading notifications…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-6 md:p-10">
        <h1 className="mb-4 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          Notifications
        </h1>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Failed to load: {error.message || "Unknown error"}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <BellRing className="h-3.5 w-3.5" />
            Provider Notifications
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Alerts about your patients & activity
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Appointment changes, lab results, imaging, prescriptions and more —
            all in one place.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <select
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-40"
              value={unread}
              onChange={(e) => updateQuery({ unread: e.target.value || "" })}
            >
              <option value="">All</option>
              <option value="true">Unread only</option>
            </select>
            <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-36"
            value={String(limit)}
            onChange={(e) => updateQuery({ limit: e.target.value })}
          >
            <option value="10">Show 10</option>
            <option value="20">Show 20</option>
            <option value="50">Show 50</option>
          </select>
        </div>
      </header>

      {/* Quick stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={Inbox}
          label="Notifications on page"
          value={rows.length}
          accent="from-blue-600 via-indigo-600 to-violet-600"
        />
        <StatTile
          icon={EyeOff}
          label="Unread on page"
          value={unreadCount}
          accent="from-emerald-600 via-teal-600 to-cyan-600"
        />
        <StatTile
          icon={Eye}
          label="Read on page"
          value={readCount}
          accent="from-amber-600 via-orange-600 to-red-600"
        />
        <StatTile
          icon={Clock}
          label="Latest notification"
          value={latestTs ? formatDateTime(latestTs) : "—"}
          accent="from-fuchsia-600 via-pink-600 to-rose-600"
          isText
        />
      </section>

      {/* List */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        <div className="space-y-2 p-4">
          {rows.map((n) => {
            const isRead = isNotificationRead(n);
            const title = n.title || n.subject || n.category || "Notification";
            const body = n.body || n.message || n.text || "";
            const created = formatDateTime(n.created_at || n.timestamp);

            return (
              <article
                key={n.id}
                className={`flex gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                  isRead
                    ? "border-slate-200 bg-white hover:bg-slate-50/80"
                    : "border-emerald-200 bg-emerald-50 hover:bg-emerald-50/80"
                }`}
              >
                {/* Left status pill */}
                <div className="mt-1">
                  <StatusBadge isRead={isRead} />
                </div>

                {/* Main content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-sm font-semibold text-slate-900">
                      {title}
                    </h2>
                    <span className="whitespace-nowrap text-xs text-slate-500">
                      {created}
                    </span>
                  </div>
                  {body && (
                    <p className="mt-1 line-clamp-3 text-sm text-slate-700">
                      {body}
                    </p>
                  )}
                  {n.kind && (
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      <TypePill value={n.kind} />
                      {n.category && n.category !== n.kind && (
                        <TypePill value={n.category} subtle />
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}

          {!rows.length && (
            <div className="px-4 py-10 text-center">
              <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
                <BellRing className="h-6 w-6 text-slate-400" />
              </div>
              <div className="text-sm font-medium text-slate-900">
                No notifications yet
              </div>
              <div className="mt-1 text-sm text-slate-500">
                New alerts will appear here automatically.
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Pager */}
      <div className="flex items-center justify-between pt-2 text-sm text-slate-600">
        <div>
          Page {page} · {total} total
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => updateQuery({ page: page - 1 })}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 shadow-sm hover:border-slate-300 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            type="button"
            disabled={rows.length < limit}
            onClick={() => updateQuery({ page: page + 1 })}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 shadow-sm hover:border-slate-300 disabled:opacity-50"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </main>
  );
}

/* ─────────────── UI helpers (UI-only) ─────────────── */

function StatTile({ icon: Icon, label, value, accent, isText = false }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">{label}</div>
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
            <Icon className="h-5 w-5 text-slate-700" />
          </div>
        </div>
        <div
          className={`mt-2 ${
            isText
              ? "text-sm font-medium text-slate-900"
              : "text-3xl font-semibold text-slate-900"
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ isRead }) {
  if (isRead) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
        <Eye className="mr-1 h-3 w-3" />
        Read
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
      <EyeOff className="mr-1 h-3 w-3" />
      New
    </span>
  );
}

function TypePill({ value, subtle = false }) {
  if (!value) return null;
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 uppercase tracking-wide";
  const cls = subtle
    ? "bg-slate-50 text-slate-500 border border-slate-200"
    : "bg-blue-50 text-blue-700 border border-blue-100";
  return (
    <span className={`${base} ${cls}`}>
      <span className="text-[10px]">
        {String(value).replaceAll("_", " ")}
      </span>
    </span>
  );
}
