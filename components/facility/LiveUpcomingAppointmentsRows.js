"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock, Stethoscope } from "lucide-react";
import { apiFetch } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

const TERMINAL_STATUSES = new Set(["COMPLETED", "CANCELLED", "NO_SHOW"]);

function normalizeToArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;

  // Defensive: sometimes client code ends up with numeric-key objects.
  if (payload && typeof payload === "object") {
    const vals = Object.values(payload);
    if (vals.every((v) => typeof v === "object" && v !== null)) return vals;
  }
  return [];
}

function parseStartDate(appt) {
  const raw =
    appt?.start_at ||
    appt?.start ||
    appt?.start_datetime ||
    appt?.scheduled_for ||
    appt?.scheduled_at;

  if (!raw || typeof raw !== "string") return null;

  // If it's only a time like "09:30", ignore for ordering.
  if (raw.length <= 5 && raw.includes(":")) return null;

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatTime(appt) {
  if (appt?.start_time) return appt.start_time;
  const d = parseStartDate(appt);
  if (!d) return appt?.time || "—";

  try {
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

/**
 * Renders ONLY table rows (<tr>...</tr>) for the facility dashboard schedule table.
 * Shows maxItems upcoming appointments (starting now) and refreshes on an interval.
 */
export default function LiveUpcomingAppointmentsRows({
  initialAppointments = [],
  pollInterval = 20000,
  maxItems = 3,
  onlyApptTypes = null,
  onlyStatuses = null,
}) {
  const [items, setItems] = useState(normalizeToArray(initialAppointments));
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const now = new Date();
      const end = new Date(now);
      // Keep the query reasonably bounded so we don’t fetch huge histories.
      end.setDate(end.getDate() + 30);

      const qs = new URLSearchParams();
      qs.set("start", now.toISOString());
      qs.set("end", end.toISOString());

      const res = await apiFetch(`/appointments/?${qs.toString()}`);
      setItems(normalizeToArray(res));
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    load();
    if (pollInterval > 0) {
      pollRef.current = setInterval(load, pollInterval);
      return () => clearInterval(pollRef.current);
    }
  }, [load, pollInterval]);

  const upcoming = useMemo(() => {
    const now = new Date();

    const typeSet = new Set(
      (Array.isArray(onlyApptTypes) ? onlyApptTypes : [])
        .map((v) => String(v || "").toUpperCase())
        .filter(Boolean)
    );

    const statusSet = new Set(
      (Array.isArray(onlyStatuses) ? onlyStatuses : [])
        .map((v) => String(v || "").toUpperCase())
        .filter(Boolean)
    );

    const withDates = items
      .map((a) => ({ a, d: parseStartDate(a) }))
      .filter(({ a, d }) => {
        if (!d || d.getTime() < now.getTime()) return false;
        const st = String(a?.status || "").toUpperCase();
        if (TERMINAL_STATUSES.has(st)) return false;

        if (typeSet.size) {
          const at = String(a?.appt_type || "").toUpperCase();
          if (!typeSet.has(at)) return false;
        }

        if (statusSet.size && !statusSet.has(st)) return false;

        return true;
      })
      .sort((x, y) => x.d - y.d)
      .slice(0, maxItems)
      .map(({ a }) => a);

    if (withDates.length) return withDates;

    // Fallback: if we can't parse start dates, still respect filters.
    const filtered = items.filter((a) => {
      const st = String(a?.status || "").toUpperCase();
      if (TERMINAL_STATUSES.has(st)) return false;
      if (typeSet.size) {
        const at = String(a?.appt_type || "").toUpperCase();
        if (!typeSet.has(at)) return false;
      }
      if (statusSet.size && !statusSet.has(st)) return false;
      return true;
    });

    return filtered.slice(0, maxItems);
  }, [items, maxItems, onlyApptTypes, onlyStatuses]);

  if (!upcoming.length) {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-10 text-center">
          <div className="text-sm font-medium text-slate-900">
            No upcoming appointments
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Upcoming appointments will appear here automatically.
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      {upcoming.map((a) => (
        <tr key={a.id} className="group transition hover:bg-slate-50">
          <td className="px-4 py-4 text-sm">
            <div className="font-medium text-slate-900">
              {a.patient_name || a.patient?.full_name || "Patient"}
            </div>
          </td>
          <td className="px-4 py-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50">
                <Stethoscope className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-sm text-slate-700">
                {a.provider_name || a.provider?.full_name || "Provider"}
              </span>
            </div>
          </td>
          <td className="px-4 py-4 text-sm">
            <span className="text-sm text-slate-600">
              {a.reason || "Consultation"}
            </span>
          </td>
          <td className="px-4 py-4 text-sm">
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
              <Clock className="h-3 w-3" />
              {formatTime(a)}
            </span>
          </td>
          <td className="px-4 py-4 text-sm">
            <StatusBadge value={a.status || "scheduled"} />
          </td>
        </tr>
      ))}
    </>
  );
}
