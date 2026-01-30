"use client";

import { useMemo } from "react";
import OutreachStatusBadge from "@/components/outreach/OutreachStatusBadge";
import { ChevronDown, MapPin } from "lucide-react";

export default function OutreachEventPicker({
  loading,
  assignments = [],
  isOutreachSuperAdmin = false,
  selectedEventId,
  selectedEvent,
  onChange,
}) {
  const options = useMemo(() => {
    if (!assignments?.length) return [];
    return assignments.map((a) => ({
      id: a?.event?.id,
      title: a?.event?.title || `Outreach #${a?.event?.id}`,
      status: a?.event?.status,
      sitesCount: Array.isArray(a?.event?.sites) ? a.event.sites.length : undefined,
    }));
  }, [assignments]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  // Staff with multiple assignments can switch.
  if (!isOutreachSuperAdmin && options.length > 1) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Active outreach</div>
            <div className="mt-1 flex items-center gap-2">
              <select
                value={selectedEventId || ""}
                onChange={(e) => onChange?.(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="-ml-8 h-4 w-4 text-slate-400 pointer-events-none" />
              <OutreachStatusBadge value={selectedEvent?.status} />
            </div>
          </div>

          {selectedEvent?.sites?.length ? (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <MapPin className="h-4 w-4 text-slate-400" />
              {selectedEvent.sites.length} site{selectedEvent.sites.length === 1 ? "" : "s"}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // Single assignment or super admin – just show context
  if (selectedEvent) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Active outreach</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{selectedEvent?.title || "Outreach"}</div>
          </div>
          <div className="flex items-center gap-3">
            <OutreachStatusBadge value={selectedEvent?.status} />
            {selectedEvent?.sites?.length ? (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <MapPin className="h-4 w-4 text-slate-400" />
                {selectedEvent.sites.length} site{selectedEvent.sites.length === 1 ? "" : "s"}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
