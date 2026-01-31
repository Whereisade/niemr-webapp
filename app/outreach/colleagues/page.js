"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useOutreachSession } from "@/lib/useOutreachSession";
import OutreachEventPicker from "@/components/outreach/OutreachEventPicker";
import { outreachFetch, normalizeList } from "@/lib/outreachApi";
import { ArrowLeft, RefreshCw, Users } from "lucide-react";

function fullName(u) {
  const first = String(u?.first_name || "").trim();
  const last = String(u?.last_name || "").trim();
  const name = [first, last].filter(Boolean).join(" ");
  return name || String(u?.email || "Staff");
}

export default function ColleaguesPage() {
  const {
    loading: sessionLoading,
    error: sessionError,
    assignments,
    isOutreachSuperAdmin,
    selectedEventId,
    selectedEvent,
    switchEvent,
  } = useOutreachSession();

  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    if (!selectedEventId) return;
    setErr("");
    setBusy(true);
    try {
      const data = await outreachFetch("/outreach/colleagues/", { eventId: selectedEventId });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || "Failed to load colleagues.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isOutreachSuperAdmin) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId, isOutreachSuperAdmin]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/outreach"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to outreach
          </Link>
          <h1 className="mt-3 flex items-center gap-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            <Users className="h-6 w-6" />
            Colleagues
          </h1>
          <p className="mt-2 text-slate-600">See the staff assigned to this outreach event.</p>
        </div>

        <button
          onClick={load}
          disabled={busy || !selectedEventId || isOutreachSuperAdmin}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {sessionError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{sessionError}</div>
      ) : null}

      {isOutreachSuperAdmin ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Super Admin can manage staff from the event details page.
        </div>
      ) : (
        <OutreachEventPicker
          loading={sessionLoading}
          assignments={assignments}
          isOutreachSuperAdmin={isOutreachSuperAdmin}
          selectedEventId={selectedEventId}
          selectedEvent={selectedEvent}
          onChange={switchEvent}
        />
      )}

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{err}</div>
      ) : null}

      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">List</div>
            <div className="mt-1 text-sm text-slate-600">{busy ? "Loading..." : `${rows.length} colleague(s)`}</div>
          </div>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {rows.length ? (
            rows.map((r) => {
              const u = r?.user || {};
              const sites = normalizeList(r?.sites)
                .map((s) => s?.name)
                .filter(Boolean);
              const siteLabel = r?.all_sites ? "All sites" : sites.length ? sites.join(", ") : "—";

              return (
                <div key={r.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{fullName(u)}</div>
                    <div className="text-sm text-slate-600">{u?.email || "—"}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
                      {r?.role_template || u?.role || "—"}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 ring-1 ring-blue-100">
                      {siteLabel}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-100">
                      {r?.is_active === false ? "Disabled" : "Active"}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-6 text-sm text-slate-600">{busy ? "Loading colleagues..." : "No colleagues found."}</div>
          )}
        </div>
      </div>
    </div>
  );
}
