"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { outreachFetch, normalizeList } from "@/lib/outreachApi";
import { Search, ArrowRight } from "lucide-react";

export default function PatientPicker({ eventId, tabKey = "overview" }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  async function load() {
    if (!eventId) return;
    setBusy(true);
    setErr("");
    try {
      const data = await outreachFetch("/outreach/patients/", { eventId });
      setRows(normalizeList(data));
    } catch (e) {
      setErr(e?.message || "Failed to load patients.");
      setRows([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (eventId) load();
  }, [eventId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((p) => {
      const hay = `${p?.patient_code || ""} ${p?.full_name || ""} ${p?.phone || ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  return (
    <div className="space-y-4">
      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{err}</div>
      ) : null}

      <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search patients…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="text-sm text-slate-600">{busy ? "Loading…" : `${filtered.length} patient(s)`}</div>
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map((p) => (
          <Link
            key={p.id}
            href={`/outreach/patients/${p.id}?tab=${encodeURIComponent(tabKey)}`}
            className="group rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-slate-900 truncate">{p.full_name}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {p.patient_code || `#${p.id}`} {p.phone ? `• ${p.phone}` : ""}
                </div>
              </div>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-700">
                Open <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        ))}

        {!busy && eventId && !filtered.length ? (
          <div className="rounded-2xl border border-slate-200/70 bg-white p-8 text-center shadow-sm">
            <div className="text-base font-semibold text-slate-900">No patients found</div>
            <p className="mt-1 text-sm text-slate-600">Try a different search, or register a new outreach patient.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
