"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { normalizeList } from "@/lib/outreachApi";
import { useOutreachSession } from "@/lib/useOutreachSession";
import OutreachStatusBadge from "@/components/outreach/OutreachStatusBadge";
import { CalendarPlus, Search, RefreshCw, ArrowLeft, CalendarDays } from "lucide-react";

export default function OutreachEventsPage() {
  const { isOutreachSuperAdmin } = useOutreachSession();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await apiFetch("/outreach/events/");
      setEvents(normalizeList(data));
    } catch (e) {
      setErr(e?.message || "Failed to load outreach events.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOutreachSuperAdmin) load();
  }, [isOutreachSuperAdmin]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return events;
    return events.filter((e) => String(e?.title || "").toLowerCase().includes(s));
  }, [events, q]);

  if (!isOutreachSuperAdmin) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold text-slate-900">Not available</div>
        <p className="mt-1 text-sm text-slate-600">
          Only Outreach Super Admin can manage outreach events.
        </p>
        <div className="mt-4">
          <Link href="/outreach" className="text-sm font-medium text-blue-700 hover:text-blue-800">
            Back to outreach →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/outreach"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Outreach events</h1>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Create, configure and close outreach events. Staff accounts and patients are tied to an event.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/outreach/events/new"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <CalendarPlus className="h-4 w-4" />
            New outreach
          </Link>
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {err}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="text-sm text-slate-600">
            {filtered.length} event{filtered.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map((evt) => (
          <Link
            key={evt.id}
            href={`/outreach/events/${evt.id}`}
            className="group rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-slate-900 truncate">{evt.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  {evt.starts_at ? new Date(evt.starts_at).toLocaleString() : "—"}{" "}
                  <span className="text-slate-300">•</span>{" "}
                  {evt.ends_at ? new Date(evt.ends_at).toLocaleString() : "—"}
                </div>
                {evt.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{evt.description}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <OutreachStatusBadge value={evt.status} />
                <span className="text-xs text-slate-500">#{evt.id}</span>
              </div>
            </div>
          </Link>
        ))}

        {!loading && !filtered.length ? (
          <div className="rounded-2xl border border-slate-200/70 bg-white p-8 text-center shadow-sm">
            <div className="text-base font-semibold text-slate-900">No events yet</div>
            <p className="mt-1 text-sm text-slate-600">Create your first outreach to start registering staff and patients.</p>
            <div className="mt-4">
              <Link
                href="/outreach/events/new"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                <CalendarPlus className="h-4 w-4" />
                New outreach
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
