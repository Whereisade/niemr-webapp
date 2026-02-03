"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useOutreachSession } from "@/lib/useOutreachSession";
import OutreachEventPicker from "@/components/outreach/OutreachEventPicker";
import { outreachFetch, normalizeList } from "@/lib/outreachApi";
import { ArrowLeft, FileDown, RefreshCw, Download, Filter, BarChart3 } from "lucide-react";

const TABS = [
  { key: "insights", label: "Insights" },
  { key: "exports", label: "Exports" },
];

const EXPORT_TYPES = [
  // Analytics exports
  { value: "executive_summary", label: "Executive Summary (PDF)" },
  { value: "patient_journey", label: "Patient Journey (PDF)" },
  { value: "staff_patients", label: "Staff → Patients (PDF)" },

  // Raw datasets (existing)
  { value: "summary", label: "Summary (raw)" },
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
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" },
  { value: "json", label: "JSON" },
];

function prettySex(x) {
  const s = String(x || "").toUpperCase();
  if (!s) return "UNKNOWN";
  if (s === "M") return "MALE";
  if (s === "F") return "FEMALE";
  return s;
}

function pct(n, d) {
  const nn = Number(n || 0);
  const dd = Number(d || 0);
  if (!dd) return "—";
  return `${Math.round((nn / dd) * 100)}%`;
}

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

  const [activeTab, setActiveTab] = useState("insights");

  // Shared
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Exports
  const [exportType, setExportType] = useState("executive_summary");
  const [format, setFormat] = useState("pdf");
  const [filtersJson, setFiltersJson] = useState("{\n  \"site_id\": null,\n  \"from\": null,\n  \"to\": null\n}");
  const [exports, setExports] = useState([]);

  // Insights
  const [insights, setInsights] = useState(null);
  const [insightsBusy, setInsightsBusy] = useState(false);
  const [insightsErr, setInsightsErr] = useState("");

  const [siteId, setSiteId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  async function loadExports() {
    if (!isOutreachSuperAdmin) return;
    if (!selectedEventId) return;
    setBusy(true);
    setErr("");
    try {
      const data = await outreachFetch("/outreach/exports/", { eventId: selectedEventId });
      setExports(normalizeList(data));
    } catch (e) {
      setErr(e?.message || "Failed to load exports.");
      setExports([]);
    } finally {
      setBusy(false);
    }
  }

  async function loadInsights() {
    if (!isOutreachSuperAdmin) return;
    if (!selectedEventId) return;
    setInsightsBusy(true);
    setInsightsErr("");
    try {
      const qs = new URLSearchParams();
      if (siteId) qs.set("site_id", siteId);
      if (fromDate) qs.set("from", fromDate);
      if (toDate) qs.set("to", toDate);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      const data = await outreachFetch(`/outreach/events/${selectedEventId}/insights/${suffix}`, { eventId: selectedEventId });
      setInsights(data || null);
    } catch (e) {
      setInsightsErr(e?.message || "Failed to load insights.");
      setInsights(null);
    } finally {
      setInsightsBusy(false);
    }
  }

  useEffect(() => {
    if (isOutreachSuperAdmin) {
      loadExports();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [isOutreachSuperAdmin, selectedEventId]);

  useEffect(() => {
    if (!isOutreachSuperAdmin) return;
    if (!selectedEventId) return;
    // Load insights on event change (default filters)
    loadInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOutreachSuperAdmin, selectedEventId]);

  const filteredExports = useMemo(() => {
    if (!selectedEventId) return [];
    return (exports || []).filter((x) => {
      const eid = x?.outreach_event?.id ?? x?.outreach_event;
      return String(eid) === String(selectedEventId);
    });
  }, [exports, selectedEventId]);

  async function generate({ export_type, fmt, filters, inline } = {}) {
    if (!selectedEventId) {
      setErr("Select an outreach event first.");
      return;
    }

    setErr("");
    setBusy(true);
    try {
      const payload = { export_type: export_type || exportType, format: fmt || format, filters: filters || {} };
      const created = await outreachFetch(`/outreach/events/${selectedEventId}/reports/`, {
        eventId: selectedEventId,
        method: "POST",
        body: JSON.stringify(payload),
      });

      await loadExports();

      const exportId = created?.id;
      if (exportId) {
        const inlineParam = inline ? "inline=1" : "";
        const url = `/api/proxy/outreach/events/${selectedEventId}/exports/${exportId}/download/${inlineParam ? `?${inlineParam}` : ""}`;
        window.open(url, "_blank");
      }
    } catch (e) {
      setErr(e?.message || "Failed to generate report.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadExecutiveSummary() {
    const filters = {
      site_id: siteId || null,
      from: fromDate || null,
      to: toDate || null,
    };
    await generate({ export_type: "executive_summary", fmt: "pdf", filters, inline: true });
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
        <p className="mt-1 text-sm text-slate-600">Only Outreach Super Admin can generate insights and exports.</p>

        <div className="mt-4">
          <Link href="/outreach" className="text-sm font-medium text-blue-700 hover:text-blue-800">
            Back to outreach →
          </Link>
        </div>
      </div>
    );
  }

  const sites = Array.isArray(selectedEvent?.sites) ? selectedEvent.sites : [];
  const k = insights?.kpis || {};
  const demo = insights?.demographics || {};
  const top = insights?.top_items || {};
  const blood = insights?.blood || {};
  const maternal = insights?.maternal || {};

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
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reports</h1>
            <p className="mt-1 text-sm text-slate-600">Insights first. Exports when you need raw data.</p>
          </div>
        </div>

        <button
          onClick={() => {
            loadExports();
            loadInsights();
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${(busy || insightsBusy) ? "animate-spin" : ""}`} />
          Refresh
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

      {err ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{err}</div> : null}

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm ${
              activeTab === t.key
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
            }`}
          >
            {t.key === "insights" ? <BarChart3 className="h-4 w-4" /> : <FileDown className="h-4 w-4" />}
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "insights" ? (
        <div className="space-y-5">
          {insightsErr ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{insightsErr}</div>
          ) : null}

          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-900">Executive summary</div>
                <p className="mt-1 text-sm text-slate-600">Professional PDF for stakeholders (auto-opens).</p>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <label className="block">
                  <div className="text-xs font-semibold text-slate-600">Site</div>
                  <select
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    className="mt-1 h-10 min-w-[160px] rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">All sites</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="text-xs font-semibold text-slate-600">From</div>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="mt-1 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </label>

                <label className="block">
                  <div className="text-xs font-semibold text-slate-600">To</div>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="mt-1 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </label>

                <button
                  onClick={loadInsights}
                  disabled={insightsBusy || !selectedEventId}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60"
                >
                  <Filter className="h-4 w-4" />
                  {insightsBusy ? "Loading…" : "Apply"}
                </button>

                <button
                  onClick={downloadExecutiveSummary}
                  disabled={busy || !selectedEventId}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {busy ? "Preparing PDF…" : "Download PDF"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-600">Patients registered</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{k.patients_registered ?? "—"}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-600">Patients seen</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{k.patients_seen ?? "—"}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-600">Staff</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{k.staff ?? "—"}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-600">Sites</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{k.sites ?? "—"}</div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold text-slate-900">Demographics</div>
              <p className="mt-1 text-sm text-slate-600">
                Age known: {demo?.age?.known ?? 0}/{demo?.age?.total ?? 0} ({pct(demo?.age?.known, demo?.age?.total)})
                • Youngest: {demo?.age?.youngest ?? "—"} • Oldest: {demo?.age?.oldest ?? "—"}
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900">Sex</div>
                  <div className="mt-3 space-y-2 text-sm">
                    {(demo?.sex || []).length ? (
                      (demo.sex || []).map((x, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-slate-700">{prettySex(x?.sex)}</span>
                          <span className="font-semibold text-slate-900">{x?.count ?? 0}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-600">No data</div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900">Age bands</div>
                  <div className="mt-3 space-y-2 text-sm">
                    {(demo?.age?.bands || []).length ? (
                      (demo.age.bands || []).map((b, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-slate-700">{b?.band}</span>
                          <span className="font-semibold text-slate-900">{b?.count ?? 0}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-600">No data</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold text-slate-900">Module usage</div>
              <p className="mt-1 text-sm text-slate-600">Ranked by record count.</p>

              <div className="mt-4 space-y-2">
                {(insights?.modules || []).length ? (
                  (insights.modules || []).slice(0, 12).map((m) => (
                    <div key={m.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{m.label}</div>
                        <div className="text-xs text-slate-600">{m.patients ?? 0} patient(s)</div>
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{m.records ?? 0}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">No module activity yet.</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold text-slate-900">Top lab tests</div>
              <div className="mt-4 space-y-2">
                {(top?.lab_tests || []).length ? (
                  (top.lab_tests || []).map((x, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                      <div className="text-sm font-semibold text-slate-900">{x?.test_name || "—"}</div>
                      <div className="text-sm font-semibold text-slate-900">{x?.count ?? 0}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">No lab activity.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold text-slate-900">Top vaccines</div>
              <div className="mt-4 space-y-2">
                {(top?.vaccines || []).length ? (
                  (top.vaccines || []).map((x, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                      <div className="text-sm font-semibold text-slate-900">{x?.vaccine_name || "—"}</div>
                      <div className="text-sm font-semibold text-slate-900">{x?.count ?? 0}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">No immunization activity.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold text-slate-900">Commonest drugs</div>
              <div className="mt-4 space-y-2">
                {(top?.drugs || []).length ? (
                  (top.drugs || []).map((x, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                      <div className="text-sm font-semibold text-slate-900">{x?.drug_name || "—"}</div>
                      <div className="text-sm font-semibold text-slate-900">{x?.count ?? 0}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">No pharmacy activity.</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold text-slate-900">Blood group & genotype</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900">Blood group</div>
                  <div className="mt-3 space-y-2 text-sm">
                    {(blood?.blood_group || []).length ? (
                      (blood.blood_group || []).map((x, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-slate-700">{x?.blood_group || "—"}</span>
                          <span className="font-semibold text-slate-900">{x?.count ?? 0}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-600">No data</div>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900">Genotype</div>
                  <div className="mt-3 space-y-2 text-sm">
                    {(blood?.genotype || []).length ? (
                      (blood.genotype || []).map((x, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-slate-700">{x?.genotype || "—"}</span>
                          <span className="font-semibold text-slate-900">{x?.count ?? 0}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-600">No data</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold text-slate-900">Maternal</div>
              <p className="mt-1 text-sm text-slate-600">Pregnancy status counts are based on latest record per patient.</p>

              <div className="mt-4 space-y-2 text-sm">
                {(maternal?.pregnancy_status || []).length ? (
                  (maternal.pregnancy_status || []).map((x, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                      <span className="text-slate-700">{x?.pregnancy_status || "—"}</span>
                      <span className="font-semibold text-slate-900">{x?.count ?? 0}</span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">No maternal records.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
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
                  onChange={(e) => {
                    const v = e.target.value;
                    setExportType(v);
                    if (v === "executive_summary") setFormat("pdf");
                  }}
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


              <button
                onClick={async () => {
                  let filters = {};
                  try {
                    filters = JSON.parse(filtersJson || "{}");
                  } catch {
                    setErr("Filters must be valid JSON.");
                    return;
                  }
                  await generate({ export_type: exportType, fmt: format, filters, inline: format === "pdf" });
                }}
                disabled={busy || !selectedEventId}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {busy ? "Generating…" : "Generate & open"}
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
                      {x.export_type} • {x.export_format}
                    </div>
                    <span className="text-xs text-slate-500">
                      {x.created_at ? new Date(x.created_at).toLocaleString() : ""}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Status: <span className="font-semibold text-slate-900">{x.status}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedEventId ? (
                      <>
                        <a
                          href={`/api/proxy/outreach/events/${selectedEventId}/exports/${x.id}/download/`}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                        {x.export_format === "pdf" ? (
                          <a
                            href={`/api/proxy/outreach/events/${selectedEventId}/exports/${x.id}/download/?inline=1`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
                          >
                            Open PDF
                          </a>
                        ) : null}
                      </>
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
      )}
    </div>
  );
}
