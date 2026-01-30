"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useOutreachSession } from "@/lib/useOutreachSession";
import OutreachEventPicker from "@/components/outreach/OutreachEventPicker";
import { outreachFetch, normalizeList } from "@/lib/outreachApi";
import { ArrowLeft, FileDown, RefreshCw, Download, Filter } from "lucide-react";

const EXPORT_TYPES = [
  { value: "summary", label: "Summary" },
  { value: "patients", label: "Patients" },
  { value: "vitals", label: "Vitals" },
  { value: "encounters", label: "Encounters" },
  { value: "lab_orders", label: "Lab Orders" },
  { value: "lab_results", label: "Lab Results" },
  { value: "dispenses", label: "Pharmacy Dispenses" },
  { value: "immunizations", label: "Immunizations" },
  { value: "blood_donations", label: "Blood Donations" },
  { value: "counseling", label: "Counseling" },
  { value: "maternal", label: "Maternal" },
  { value: "audit_logs", label: "Audit Logs" },
];

const FORMATS = [
  { value: "csv", label: "CSV" },
  { value: "json", label: "JSON" },
  { value: "pdf", label: "PDF" },
];

export default function OutreachReportsPage() {
  const {
    loading: sessionLoading,
    error: sessionError,
    assignments,
    isOutreachSuperAdmin,
    selectedEventId,
    selectedEvent,
    switchEvent,
  } = useOutreachSession();

  const [exportType, setExportType] = useState("summary");
  const [format, setFormat] = useState("csv");
  const [filtersJson, setFiltersJson] = useState("{\n  \"site_id\": null,\n  \"from\": null,\n  \"to\": null\n}");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [exports, setExports] = useState([]);

  async function loadExports() {
    if (!isOutreachSuperAdmin) return;
    setBusy(true);
    setErr("");
    try {
      const data = await outreachFetch("/outreach/exports/", { eventId: selectedEventId || undefined });
      setExports(normalizeList(data));
    } catch (e) {
      setErr(e?.message || "Failed to load exports.");
      setExports([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (isOutreachSuperAdmin) loadExports();
  }, [isOutreachSuperAdmin]);

  const filteredExports = useMemo(() => {
    if (!selectedEventId) return [];
    return (exports || []).filter((x) => {
      const eid = x?.outreach_event?.id ?? x?.outreach_event;
      return String(eid) === String(selectedEventId);
    });
  }, [exports, selectedEventId]);

  async function generate() {
    if (!selectedEventId) {
      setErr("Select an outreach event first.");
      return;
    }
    setErr("");
    let filters = {};
    try {
      filters = JSON.parse(filtersJson || "{}");
    } catch {
      setErr("Filters must be valid JSON.");
      return;
    }

    setBusy(true);
    try {
      const payload = { export_type: exportType, format, filters };
      const created = await outreachFetch(`/outreach/events/${selectedEventId}/reports/`, {
        eventId: selectedEventId,
        method: "POST",
        body: JSON.stringify(payload),
      });
      // Refresh exports list
      await loadExports();
      // Auto-open download if available
      const exportId = created?.id;
      if (exportId) {
        window.open(`/api/proxy/outreach/events/${selectedEventId}/exports/${exportId}/download/`, "_blank");
      }
    } catch (e) {
      setErr(e?.message || "Failed to generate report.");
    } finally {
      setBusy(false);
    }
  }

  if (sessionError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {sessionError}
      </div>
    );
  }

  if (!isOutreachSuperAdmin) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold text-slate-900">Not available</div>
        <p className="mt-1 text-sm text-slate-600">Only Outreach Super Admin can generate exports and reports.</p>
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
        <div className="flex items-center gap-3">
          <Link
            href="/outreach"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reports & exports</h1>
            <p className="mt-1 text-sm text-slate-600">Generate documentation exports for a completed outreach.</p>
          </div>
        </div>

        <button
          onClick={loadExports}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          Refresh exports
        </button>
      </div>

      <OutreachEventPicker
        loading={sessionLoading}
        assignments={assignments}
        isOutreachSuperAdmin={isOutreachSuperAdmin}
        selectedEventId={selectedEventId}
        selectedEvent={selectedEvent}
        onChange={switchEvent}
      />

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{err}</div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/10 text-blue-700">
              <FileDown className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900">Generate export</div>
              <p className="text-sm text-slate-600">Choose type, format and filters.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="block space-y-1">
              <div className="text-sm font-medium text-slate-700">Export type</div>
              <select
                value={exportType}
                onChange={(e) => setExportType(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {EXPORT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <div className="text-sm font-medium text-slate-700">Format</div>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {FORMATS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Filter className="h-4 w-4 text-slate-500" />
                Filters (JSON)
              </div>
              <textarea
                value={filtersJson}
                onChange={(e) => setFiltersJson(e.target.value)}
                className="min-h-[160px] w-full rounded-xl border border-slate-200 p-3 font-mono text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <div className="text-xs text-slate-500">
                Keep it simple; unknown keys are ignored. Use dates like <span className="font-mono">YYYY-MM-DD</span>.
              </div>
            </label>

            <button
              onClick={generate}
              disabled={busy || !selectedEventId}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {busy ? "Generating…" : "Generate & download"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Exports for this event</div>
          <p className="mt-1 text-sm text-slate-600">
            {selectedEventId ? `${filteredExports.length} export(s)` : "Select an event to view exports."}
          </p>

          <div className="mt-4 space-y-3">
            {filteredExports.map((x) => (
              <div key={x.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">
                    {x.export_type} • {x.file_format}
                  </div>
                  <span className="text-xs text-slate-500">{new Date(x.created_at).toLocaleString()}</span>
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Status: <span className="font-semibold text-slate-900">{x.status}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedEventId ? (
                    <a
                      href={`/api/proxy/outreach/events/${selectedEventId}/exports/${x.id}/download/`}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  ) : null}
                </div>
              </div>
            ))}

            {selectedEventId && !filteredExports.length ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                No exports yet. Generate one from the panel on the left.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
