"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { createLabOrder } from "@/lib/labsActions";
import { pauseEncounter } from "@/lib/encounterActions";
import {
  ArrowLeft,
  Beaker,
  Search,
  Plus,
  Loader2,
  AlertTriangle,
  ChevronRight,
  Building2,
  MapPin,
  RefreshCw,
  Bug,
  X,
} from "lucide-react";

const PRIORITY_OPTIONS = [
  { value: "ROUTINE", label: "Routine" },
  { value: "URGENT", label: "Urgent" },
  { value: "STAT", label: "Stat" },
];

function normalizeList(body) {
  if (!body) return [];
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object") {
    const numericKeys = Object.keys(body).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => body[k]);
    }
  }
  return [];
}

function fullName(p) {
  if (p?.display_name) {
    return p.display_name;
  }
  const n = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim();
  return n || p?.email || `#${p?.id || "—"}`;
}

function formatAddress(p) {
  if (!p) return "";
  const parts = [p?.lga, p?.state].filter(Boolean);
  return parts.length ? parts.join(", ") : (p?.address || "").substring(0, 40);
}

export default function FacilityEncounterLabsPage() {
  const params = useParams();
  const router = useRouter();
  const encounterId = params?.id;

  const [me, setMe] = useState(null);
  const [encounter, setEncounter] = useState(null);
  const [loadingEncounter, setLoadingEncounter] = useState(true);
  const [error, setError] = useState("");

  // Catalog search
  const [q, setQ] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [catalogSource, setCatalogSource] = useState("facility");
  const [debugInfo, setDebugInfo] = useState(null); // 🔍 Debug info

  // Selection
  const [selectedCodes, setSelectedCodes] = useState(() => new Set());
  // Keep lightweight details for selected catalog items so summary/list don't break on search
  const [selectedMeta, setSelectedMeta] = useState(() => ({}));
  const [manualName, setManualName] = useState("");
  const [manualTests, setManualTests] = useState([]);

  // Outsource
  const [labsProviders, setLabsProviders] = useState([]);
  const [labsProvidersLoading, setLabsProvidersLoading] = useState(false);
  const [outsourcedToUserId, setOutsourcedToUserId] = useState("");
  const [wantsOutsource, setWantsOutsource] = useState(false);

  // Order meta
  const [priority, setPriority] = useState("ROUTINE");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [showDebug, setShowDebug] = useState(false); // 🔍 Toggle debug panel

  const selectedProvider = useMemo(() => {
    if (!outsourcedToUserId) return null;
    return labsProviders.find((p) => String(p?.user) === String(outsourcedToUserId)) || null;
  }, [outsourcedToUserId, labsProviders]);

  async function loadMe() {
    try {
      const data = await apiFetch("/accounts/me/", { method: "GET" });
      setMe(data || null);
    } catch {
      setMe(null);
    }
  }

  async function loadEncounter() {
    if (!encounterId) return;
    setError("");
    setLoadingEncounter(true);
    try {
      const data = await apiFetch(`/encounters/${encounterId}/`, { method: "GET" });
      setEncounter(data);
    } catch (err) {
      setError(err?.message || "Failed to load encounter.");
      setEncounter(null);
    } finally {
      setLoadingEncounter(false);
    }
  }

  async function loadCatalog(search = "", source = "facility", userId = null) {
    setCatalogError("");
    setCatalogLoading(true);
    setCatalogSource(source);
    
    // 🔍 Build debug info
    const debugData = {
      timestamp: new Date().toISOString(),
      source,
      userId,
      search,
      url: "",
      response: null,
      error: null,
    };
    
    try {
      let url = "/labs/catalog/";
      const params = new URLSearchParams();
      
      if (search?.trim()) {
        params.set("s", search.trim());
      }
      
      // 🔥 Pass created_by parameter for outsourced catalog
      if (source === "outsourced" && userId) {
        params.set("created_by", String(userId));
      }
      
      const qs = params.toString();
      url = qs ? `${url}?${qs}` : url;
      
      debugData.url = url; // 🔍 Store URL
      
      console.log(`[loadCatalog] Fetching: ${url}`); // 🔍 Console log
      
      const res = await apiFetch(url, { method: "GET" });
      const tests = normalizeList(res);
      
      debugData.response = {
        rawType: typeof res,
        isArray: Array.isArray(res),
        hasResults: !!res?.results,
        count: tests.length,
        firstThree: tests.slice(0, 3).map(t => ({
          id: t?.id,
          code: t?.code,
          name: t?.name,
          created_by: t?.created_by,
          facility: t?.facility,
        })),
      }; // 🔍 Store response details
      
      setCatalog(tests);
      
      console.log(`[loadCatalog] Success: ${tests.length} tests loaded`); // 🔍 Console log
    } catch (err) {
      debugData.error = {
        message: err?.message,
        stack: err?.stack,
      }; // 🔍 Store error
      
      setCatalogError(err?.message || "Failed to load lab catalog.");
      setCatalog([]);
      
      console.error(`[loadCatalog] Error:`, err); // 🔍 Console log
    } finally {
      setCatalogLoading(false);
      setDebugInfo(debugData); // 🔍 Store debug info
    }
  }

  async function loadIndependentLabs() {
    setLabsProvidersLoading(true);
    try {
      const res = await apiFetch(
        "/providers/?facility=none&type=LAB_SCIENTIST&page=1&limit=50",
        { method: "GET" }
      );
      const providers = normalizeList(res);
      setLabsProviders(providers);
      
      console.log(`[loadIndependentLabs] Loaded ${providers.length} independent labs`); // 🔍 Console log
      if (providers.length > 0) {
        console.log('[loadIndependentLabs] First provider:', {
          id: providers[0]?.id,
          user: providers[0]?.user,
          display_name: providers[0]?.display_name,
          business_name: providers[0]?.business_name,
        }); // 🔍 Console log
      }
    } catch (err) {
      console.error('[loadIndependentLabs] Error:', err); // 🔍 Console log
      setLabsProviders([]);
    } finally {
      setLabsProvidersLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
    loadEncounter();
    loadCatalog("", "facility");
    loadIndependentLabs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounterId]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      // Always search within the currently selected catalog scope
      const source = outsourcedToUserId ? "outsourced" : "facility";
      loadCatalog(q, source, outsourcedToUserId || null);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, outsourcedToUserId]);

  // 🔥 Auto-reload catalog when outsourced lab changes
  useEffect(() => {
    if (outsourcedToUserId) {
      console.log(`[useEffect] Outsourced lab changed to user ID: ${outsourcedToUserId}`); // 🔍 Console log
      setWantsOutsource(true);
      setQ("");
      setSelectedCodes(new Set());
      setSelectedMeta({});
      loadCatalog("", "outsourced", outsourcedToUserId);
    } else {
      console.log('[useEffect] Outsource cleared, loading facility catalog'); // 🔍 Console log
      setQ("");
      setSelectedCodes(new Set());
      setSelectedMeta({});
      loadCatalog("", "facility");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outsourcedToUserId]);

  const canDoctorActions = useMemo(() => {
    const role = String(me?.role || "").toUpperCase();
    return ["DOCTOR", "ADMIN", "SUPER_ADMIN"].includes(role);
  }, [me]);

  const selectionSummary = useMemo(() => {
    const catalogCount = selectedCodes.size;
    const manualCount = manualTests.length;
    const totalCount = catalogCount + manualCount;
    const estTotal = Object.values(selectedMeta || {}).reduce((sum, m) => {
      const n = Number(m?.price);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    return { catalogCount, manualCount, totalCount, estTotal };
  }, [selectedCodes, manualTests, selectedMeta]);

  function toggleCode(code) {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      const k = String(code);
      const willSelect = !next.has(k);

      if (willSelect) next.add(k);
      else next.delete(k);

      setSelectedMeta((pm) => {
        const nextMeta = { ...(pm || {}) };
        if (willSelect) {
          const t = catalog?.find((x) => String(x?.code) === k);
          nextMeta[k] = {
            code: k,
            name: t?.name || k,
            unit: t?.unit || "",
            price: t?.price ?? null,
          };
        } else {
          delete nextMeta[k];
        }
        return nextMeta;
      });

      return next;
    });
  }

  function addManual() {
    const v = (manualName || "").trim();
    if (!v) return;
    setManualTests((prev) => {
      if (prev.some((x) => String(x).toLowerCase() === v.toLowerCase())) return prev;
      return [...prev, v];
    });
    setManualName("");
  }

  function removeManual(name) {
    setManualTests((prev) => prev.filter((x) => x !== name));
  }

  function clearAllSelections() {
    setSelectedCodes(new Set());
    setSelectedMeta({});
    setManualTests([]);
    setManualName("");
  }

  async function handleSkipLabs() {
    if (!encounterId) return;
    setError("");
    setSubmitting(true);
    try {
      await apiFetch(`/encounters/${encounterId}/skip_labs/`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      router.push(`/facility/encounters/${encounterId}/workflow/prescription`);
    } catch (err) {
      setError(err?.message || "Failed to skip labs.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOrderLabs(e) {
    e.preventDefault();
    if (!encounterId) return;

    setError("");

    if (!canDoctorActions) {
      setError("Only doctors (or admins) can order labs from the encounter workflow.");
      return;
    }

    const patientId = encounter?.patient;
    if (!patientId) {
      setError("This encounter does not have a patient linked.");
      return;
    }

    const items = [
      ...Array.from(selectedCodes).map((code) => ({ test_code: String(code) })),
      ...manualTests.map((name) => ({ requested_name: String(name) })),
    ];

    if (!items.length) {
      setError("Select at least one catalog test or add at least one manual test request.");
      return;
    }

    if (wantsOutsource && !outsourcedToUserId) {
      setError("Select an independent lab to outsource to, or switch back to Facility lab.");
      return;
    }

    setSubmitting(true);
    try {
      await createLabOrder({
        patient: patientId,
        priority,
        note,
        encounter_id: Number(encounterId),
        outsourced_to: outsourcedToUserId ? Number(outsourcedToUserId) : null,
        items,
      });

      await pauseEncounter(encounterId);

      router.push(`/facility/encounters/${encounterId}/workflow/waiting-labs`);
    } catch (err) {
      setError(err?.message || "Failed to order labs.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingEncounter) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-slate-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading encounter…
        </div>
      </div>
    );
  }

  if (error && !encounter) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <div className="font-semibold">Could not open encounter</div>
          <div className="mt-1 text-sm">{error}</div>
          <div className="mt-3">
            <Link
              href="/facility/encounters"
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Encounters
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const patientLabel = `Patient #${encounter?.patient || "—"}`;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-col items-start justify-between gap-4 lg:flex-row">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Link
              href={`/facility/encounters/${encounterId}`}
              className="inline-flex items-center gap-2 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Encounter
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-slate-800">Labs</span>
          </div>

          <h1 className="mt-2 text-xl font-semibold text-slate-900">
            Order Labs
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {patientLabel} • Encounter #{encounterId}
          </p>
        </div>

        {/* 🔍 Debug toggle button */}
        {/* <button
          type="button"
          onClick={() => setShowDebug(!showDebug)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
          title="Toggle debug panel"
        >
          <Bug className="h-3 w-3" />
          {showDebug ? "Hide" : "Show"} Debug
        </button> */}
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {!canDoctorActions ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Only doctors (or admins) can place lab orders in this workflow.
        </div>
      ) : null}

      {/* 🔍 Debug panel */}
      {showDebug && debugInfo ? (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-900 mb-2">
            <Bug className="h-4 w-4" />
            Debug Information
          </div>
          <pre className="text-xs text-blue-800 overflow-x-auto bg-white p-3 rounded border border-blue-200">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
          <div className="mt-2 text-xs text-blue-700">
            Check browser console for detailed logs. Open DevTools (F12) → Console tab
          </div>
        </div>
      ) : null}

      <form onSubmit={handleOrderLabs} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: Catalog */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Beaker className="h-5 w-5 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900">
                Test Catalog
              </h2>
              {catalogSource === "outsourced" && selectedProvider ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">
                  <Building2 className="h-3 w-3" />
                  {fullName(selectedProvider)}
                </span>
              ) : catalogSource === "facility" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  <Building2 className="h-3 w-3" />
                  Facility Catalog
                </span>
              ) : null}
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by code or name…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
              />
            </div>
          </div>

          {catalogError ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <div className="font-medium">Failed to load catalog</div>
              <div className="mt-1">{catalogError}</div>
              <button
                type="button"
                onClick={() => loadCatalog(q, catalogSource, outsourcedToUserId || null)}
                className="mt-2 inline-flex items-center gap-1 text-xs underline"
              >
                <RefreshCw className="h-3 w-3" />
                Try again
              </button>
            </div>
          ) : null}

          {catalogSource === "outsourced" && selectedProvider ? (
            <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-sky-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-sky-800">
                  <div className="font-medium">Viewing outsourced lab catalog</div>
                  <div className="mt-1 text-xs">
                    You're browsing tests from <span className="font-semibold">{fullName(selectedProvider)}</span>.
                    Select tests to include in your order. To return to facility catalog, clear the outsource selection below.
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-3 rounded-xl border border-slate-100">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 w-10"></th>
                    <th className="px-3 py-2">Test</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2 text-right">Price (₦)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {catalogLoading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-slate-600">
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading catalog…
                        </span>
                      </td>
                    </tr>
                  ) : catalog.length ? (
                    catalog.map((t) => {
                      const code = String(t?.code || "");
                      const checked = selectedCodes.has(code);
                      return (
                        <tr key={code} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCode(code)}
                              className="h-4 w-4"
                            />
                          </td>
                          <td className="px-3 py-2 text-slate-900">
                            {t?.name || "—"}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">
                            {code || "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {t?.unit || "—"}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-700">
                            {t?.price ? Number(t.price).toLocaleString() : "—"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-600">
                        {catalogSource === "outsourced" ? (
                          <div>
                            <div className="font-medium text-slate-900">No tests found in this lab's catalog</div>
                            <div className="mt-2 text-xs text-slate-600">
                              The selected lab ({fullName(selectedProvider) || "Unknown"}) may not have any tests configured yet.
                            </div>
                            <div className="mt-3 text-xs text-slate-500">
                              <div className="font-medium mb-1">Debug Info:</div>
                              <div>User ID: {outsourcedToUserId || "Not set"}</div>
                              <div>API Called: {debugInfo?.url || "N/A"}</div>
                              <div>Results: {debugInfo?.response?.count ?? "N/A"} tests</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowDebug(true)}
                              className="mt-3 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              <Bug className="h-3 w-3" />
                              Show full debug info
                            </button>
                          </div>
                        ) : (
                          "No tests found."
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Manual typed requests */}
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">
                Manual Test Requests
              </div>
              <div className="text-xs text-slate-600">
                Use when the test is not in the catalog
              </div>
            </div>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Type a test (e.g., 'Malaria smear')"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <button
                type="button"
                onClick={addManual}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            {manualTests.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {manualTests.map((name) => (
                  <button
                    type="button"
                    key={name}
                    onClick={() => removeManual(name)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 hover:bg-slate-50"
                    title="Click to remove"
                  >
                    {name} ✕
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-600">
                No manual tests added.
              </div>
            )}
          </div>
        </div>

        {/* Right: Meta + Outsource + Submit */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Order Details</h2>

          <div className="mt-3 grid gap-3">
            {/* Summary selection box (routing + quick stats) */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Summary
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {selectionSummary.totalCount
                      ? `${selectionSummary.totalCount} test${selectionSummary.totalCount === 1 ? "" : "s"} selected`
                      : "No tests selected yet"}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {selectionSummary.estTotal ? (
                      <>
                        Estimated total:{" "}
                        <span className="font-semibold text-slate-900">
                          ₦{selectionSummary.estTotal.toLocaleString()}
                        </span>
                        {selectionSummary.manualCount ? (
                          <span className="text-slate-500"> (manual tests not priced)</span>
                        ) : null}
                      </>
                    ) : selectionSummary.manualCount ? (
                      "Manual tests selected (no price estimate)"
                    ) : (
                      "Pick tests on the left to build your order."
                    )}
                  </div>
                </div>

                {(selectionSummary.totalCount || wantsOutsource || note || priority !== "ROUTINE") ? (
                  <button
                    type="button"
                    onClick={() => {
                      clearAllSelections();
                      setNote("");
                      setPriority("ROUTINE");
                      setWantsOutsource(false);
                      setOutsourcedToUserId("");
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    title="Reset order details"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reset
                  </button>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Catalog
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-900">
                    {selectionSummary.catalogCount}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Manual
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-900">
                    {selectionSummary.manualCount}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Route
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-900">
                    {wantsOutsource ? (outsourcedToUserId ? "Independent" : "Pick lab") : "Facility"}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Processing
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWantsOutsource(false);
                      setOutsourcedToUserId("");
                    }}
                    className={
                      wantsOutsource
                        ? "rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:bg-slate-50"
                        : "rounded-xl border border-slate-900 bg-white px-3 py-2 text-left text-sm shadow-sm"
                    }
                  >
                    <div className="font-semibold text-slate-900">Facility Lab</div>
                    <div className="mt-0.5 text-xs text-slate-600">Use facility catalog & workflow</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWantsOutsource(true)}
                    className={
                      wantsOutsource
                        ? "rounded-xl border border-slate-900 bg-white px-3 py-2 text-left text-sm shadow-sm"
                        : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:bg-slate-50"
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-700" />
                      <div className="font-semibold text-slate-900">Independent Lab</div>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">Outsource & route results</div>
                  </button>
                </div>

                {wantsOutsource ? (
                  <div className="mt-3">
                    <select
                      value={outsourcedToUserId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setOutsourcedToUserId(v);
                        setWantsOutsource(true);
                      }}
                      disabled={labsProvidersLoading}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:opacity-60"
                    >
                      <option value="">— Select independent lab —</option>
                      {labsProviders.map((p) => {
                        const name = fullName(p);
                        const addr = formatAddress(p);
                        return (
                          <option key={String(p?.user)} value={String(p?.user)}>
                            {name}{addr ? ` • ${addr}` : ""}
                          </option>
                        );
                      })}
                    </select>

                    {!outsourcedToUserId ? (
                      <div className="mt-2 text-xs text-slate-600">
                        Pick a lab to switch the catalog on the left and route this order externally.
                      </div>
                    ) : null}

                    {selectedProvider ? (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                        <div className="text-xs">
                          <div className="font-semibold text-slate-900">
                            {fullName(selectedProvider)}
                          </div>
                          {selectedProvider?.phone ? (
                            <div className="mt-1 text-slate-600">📞 {selectedProvider.phone}</div>
                          ) : null}
                          {formatAddress(selectedProvider) ? (
                            <div className="mt-1 flex items-start gap-1 text-slate-600">
                              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{formatAddress(selectedProvider)}</span>
                            </div>
                          ) : null}
                          {selectedProvider?.address ? (
                            <div className="mt-1 text-slate-500 text-xs line-clamp-2">
                              {selectedProvider.address}
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          disabled={!outsourcedToUserId}
                          onClick={() => {
                            setQ("");
                            loadCatalog("", "outsourced", outsourcedToUserId);
                          }}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 disabled:opacity-60"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Reload catalog
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Priority
              </span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Note
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="Optional clinical context for lab (e.g., suspected malaria, anemia workup)…"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </label>

            <div className="rounded-2xl border border-slate-100 bg-white p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Selected Tests
              </div>

              <div className="mt-2 text-sm text-slate-900">
                {selectedCodes.size + manualTests.length ? (
                  <div className="space-y-1">
                    {Array.from(selectedCodes).slice(0, 8).map((c) => {
                      const meta = selectedMeta?.[String(c)];
                      const testName = meta?.name || c;
                      return (
                        <div key={c} className="flex items-center justify-between">
                          <span className="text-xs">{testName}</span>
                          <button
                            type="button"
                            className="text-xs text-slate-500 hover:text-slate-900"
                            onClick={() => toggleCode(c)}
                          >
                            remove
                          </button>
                        </div>
                      );
                    })}
                    {manualTests.slice(0, 8).map((m) => (
                      <div key={m} className="flex items-center justify-between">
                        <span className="text-xs">{m}</span>
                        <button
                          type="button"
                          className="text-xs text-slate-500 hover:text-slate-900"
                          onClick={() => removeManual(m)}
                        >
                          remove
                        </button>
                      </div>
                    ))}
                    {(selectedCodes.size + manualTests.length) > 16 ? (
                      <div className="text-xs text-slate-500">
                        +{(selectedCodes.size + manualTests.length) - 16} more…
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-xs text-slate-600">Nothing selected yet.</div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !canDoctorActions}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Beaker className="h-4 w-4" />}
              Order Labs
            </button>

            <button
              type="button"
              onClick={handleSkipLabs}
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
            >
              Prescription
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
