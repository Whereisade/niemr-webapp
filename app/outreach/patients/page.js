"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { outreachFetch } from "@/lib/outreachApi";
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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const canCreate = isOutreachSuperAdmin || hasPerm(permissions, OUTREACH_PERMS.PATIENTS_CREATE);

  const loadPatients = useCallback(async (pageNumber = 1, searchQuery = q) => {
    if (!selectedEventId) return;
    setBusy(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageNumber));
      params.set("limit", "20");

      const search = String(searchQuery || "").trim();
      if (search) params.set("q", search);

      const data = await outreachFetch(`/outreach/patients/?${params.toString()}`, {
        eventId: selectedEventId,
      });
      const results = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];

      setRows(results);
      setTotal(typeof data?.count === "number" ? data.count : results.length);
      setHasNext(Boolean(data?.next));
      setHasPrevious(Boolean(data?.previous));
      setPage(pageNumber);
    } catch (e) {
      setErr(e?.message || "Failed to load patients.");
      setRows([]);
      setTotal(0);
      setHasNext(false);
      setHasPrevious(false);
    } finally {
      setBusy(false);
    }
  }, [selectedEventId, q]);

  useEffect(() => {
    if (!selectedEventId) return;

    const timer = setTimeout(() => {
      loadPatients(1, q);
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedEventId, q, loadPatients]);

  const filtered = rows;

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
              {busy ? "Loading…" : `${total} patient${total === 1 ? "" : "s"}`}
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

      {selectedEventId && (hasPrevious || hasNext) ? (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-600">
            {busy ? "Loading…" : `${total} patient${total === 1 ? "" : "s"} found`}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy || !hasPrevious}
              onClick={() => loadPatients(page - 1)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50"
            >
              Previous
            </button>

            <div className="px-2 text-sm font-medium text-slate-700">Page {page}</div>

            <button
              type="button"
              disabled={busy || !hasNext}
              onClick={() => loadPatients(page + 1)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
