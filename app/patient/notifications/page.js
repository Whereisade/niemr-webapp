"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useNotifications } from "@/lib/useNotifications";

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

export default function PatientNotificationsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page   = Number(sp.get("page") || 1);
  const limit  = Number(sp.get("limit") || 20);
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
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-4">
          My Notifications
        </h1>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
          Loading notifications…
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-4">
          My Notifications
        </h1>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Failed to load: {error.message || "Unknown error"}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-10 space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            My Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Updates about your appointments, test results, and prescriptions.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-40"
            value={unread}
            onChange={(e) =>
              updateQuery({ unread: e.target.value || "" })
            }
          >
            <option value="">All</option>
            <option value="true">Unread only</option>
          </select>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-36"
            value={String(limit)}
            onChange={(e) => updateQuery({ limit: e.target.value })}
          >
            <option value="10">Show 10</option>
            <option value="20">Show 20</option>
            <option value="50">Show 50</option>
          </select>
        </div>
      </header>

      <div className="space-y-2">
        {rows.map((n) => {
          const isRead = Boolean(n.is_read ?? n.read);
          const title =
            n.title || n.subject || n.category || "Notification";
          const body =
            n.body || n.message || n.text || "";
          const created = formatDateTime(n.created_at || n.timestamp);

          return (
            <div
              key={n.id}
              className={`flex gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${
                isRead
                  ? "border-slate-200 bg-white"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <div className="mt-1">
                <span
                  className={
                    isRead
                      ? "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                      : "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                  }
                >
                  {isRead ? "Read" : "New"}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {title}
                  </h2>
                  <span className="text-xs text-slate-500">{created}</span>
                </div>
                {body && (
                  <p className="mt-1 text-sm text-slate-700 line-clamp-3">
                    {body}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {!rows.length && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            No notifications yet.
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 text-sm text-slate-600">
        <div>
          Page {page} · {total} total
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => updateQuery({ page: page - 1 })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={rows.length < limit}
            onClick={() => updateQuery({ page: page + 1 })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </main>
  );
}
