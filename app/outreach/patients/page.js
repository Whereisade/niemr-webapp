"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { outreachFetch, normalizeList } from "@/lib/outreachApi";
import { useOutreachSession } from "@/lib/useOutreachSession";
import OutreachEventPicker from "@/components/outreach/OutreachEventPicker";
import { Search, UserPlus, ArrowRight, Phone, MapPin } from "lucide-react";
import { hasPerm, OUTREACH_PERMS } from "@/lib/outreachConfig";

export default function OutreachPatientsPage() {
  const {
    loading: sessionLoading,
    error: sessionError,
    assignments,
    isOutreachSuperAdmin,
    selectedEventId,
    selectedEvent,
    permissions,
    switchEvent,
  } = useOutreachSession();

  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  const canCreate = isOutreachSuperAdmin || hasPerm(permissions, OUTREACH_PERMS.PATIENTS_CREATE);

  async function load() {
    if (!selectedEventId) return;
    setBusy(true);
    setErr("");
    try {
      const data = await outreachFetch("/outreach/patients/", { eventId: selectedEventId });
      setRows(normalizeList(data));
    } catch (e) {
      setErr(e?.message || "Failed to load patients.");
      setRows([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (selectedEventId) load();
  }, [selectedEventId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((p) => {
      const hay = `${p?.patient_code || ""} ${p?.full_name || ""} ${p?.phone || ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  if (sessionError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {sessionError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Outreach patients</h1>
          <p className="mt-1 text-sm text-slate-600">
            Patients registered here are scoped to the selected outreach event.
          </p>
        </div>

        {canCreate ? (
          <Link
            href="/outreach/patients/new"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4" />
            New patient
          </Link>
        ) : null}
      </div>

      <OutreachEventPicker
        loading={sessionLoading}
        assignments={assignments}
        isOutreachSuperAdmin={isOutreachSuperAdmin}
        selectedEventId={selectedEventId}
        selectedEvent={selectedEvent}
        onChange={switchEvent}
      />

      {!selectedEventId ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="text-base font-semibold text-slate-900">Select an outreach event</div>
          <p className="mt-1 text-sm text-slate-600">
            You need an active outreach context to list patients.
          </p>
        </div>
      ) : null}

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{err}</div>
      ) : null}

      {selectedEventId ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, code or phone..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="text-sm text-slate-600">
              {busy ? "Loading…" : `${filtered.length} patient${filtered.length === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4">
        {filtered.map((p) => (
          <Link
            key={p.id}
            href={`/outreach/patients/${p.id}`}
            className="group rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-lg font-semibold text-slate-900 truncate">{p.full_name}</div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                    {p.patient_code || `#${p.id}`}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  {p.phone ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {p.phone}
                    </span>
                  ) : null}
                  {p.community || p.address ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {[p.community, p.address].filter(Boolean).join(" • ")}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-700">
                Open <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        ))}

        {!busy && selectedEventId && !filtered.length ? (
          <div className="rounded-2xl border border-slate-200/70 bg-white p-8 text-center shadow-sm">
            <div className="text-base font-semibold text-slate-900">No patients yet</div>
            <p className="mt-1 text-sm text-slate-600">Register your first outreach patient to start capturing records.</p>
            {canCreate ? (
              <div className="mt-4">
                <Link
                  href="/outreach/patients/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4" />
                  New patient
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
