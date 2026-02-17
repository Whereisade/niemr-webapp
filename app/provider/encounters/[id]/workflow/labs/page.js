// app/provider/encounters/[id]/workflow/labs/page.js - FIXED VERSION
// ✅ Shows independent lab provider business name, address, and phone
// ✅ Properly loads their catalog when selected
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
  Info,
  UserRound,
  MapPin,
  Phone,
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

// ✅ FIXED: Get provider display name with business name priority
function getProviderDisplayName(p) {
  // Priority: business_name > full_name > email > ID
  if (p?.business_name) return p.business_name;
  const n = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim();
  return n || p?.email || `Provider #${p?.user || p?.id || "—"}`;
}

// ✅ NEW: Get provider contact details
function getProviderDetails(p) {
  const parts = [];
  if (p?.address) parts.push(p.address);
  if (p?.phone) parts.push(`📞 ${p.phone}`);
  return parts.join(" • ");
}

export default function ProviderEncounterLabsPage() {
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

  // Selection
  const [selectedCodes, setSelectedCodes] = useState(() => new Set());
  // Keep lightweight details for selected catalog items so summary/list don't break on search
  const [selectedMeta, setSelectedMeta] = useState(() => ({}));
  const [manualName, setManualName] = useState("");
  const [manualTests, setManualTests] = useState([]);

  // Outsource
  const [labsProviders, setLabsProviders] = useState([]);
  const [labsProvidersLoading, setLabsProvidersLoading] = useState(false);
  const [outsourcedToUserId, setOutsourcedToUserId] = useState(""); // user id (p.user)
  const [wantsOutsource, setWantsOutsource] = useState(false);

  // Order meta
  const [priority, setPriority] = useState("ROUTINE");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const selectedProvider = useMemo(() => {
    if (!outsourcedToUserId) return null;
    return labsProviders.find((p) => String(p?.user) === String(outsourcedToUserId)) || null;
  }, [outsourcedToUserId, labsProviders]);

  const isIndependentProvider = me && !me.facility_id;

  // Independent doctors always outsource labs: force outsource mode for this view
  useEffect(() => {
    if (isIndependentProvider) {
      setWantsOutsource(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIndependentProvider]);

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

  // ✅ FIXED: Load catalog from outsourced lab if selected
  async function loadCatalog(search = "") {
    setCatalogError("");
    setCatalogLoading(true);
    try {
      const params = new URLSearchParams();
      if (search?.trim()) {
        params.set("s", search.trim());
      }

      // Independent doctors do not have an in-house catalog.
      // Avoid fetching the default catalog for them; wait until a lab scientist is selected.
      if (isIndependentProvider && !outsourcedToUserId) {
        setCatalog([]);
        return;
      }
      
      // ✅ If outsourced lab is selected, fetch their catalog
      if (outsourcedToUserId) {
        params.set("created_by", outsourcedToUserId);
      }
      
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await apiFetch(`/labs/catalog/${qs}`, { method: "GET" });
      setCatalog(normalizeList(res));
    } catch (err) {
      setCatalogError(err?.message || "Failed to load lab catalog.");
      setCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  }

  async function loadIndependentLabs() {
    setLabsProvidersLoading(true);
    try {
      // Providers list, independent only, filtered by LAB role
      const res = await apiFetch(
        "/providers/?facility=none&type=LAB_SCIENTIST&page=1&limit=50",
        { method: "GET" }
      );
      setLabsProviders(normalizeList(res));
    } catch {
      setLabsProviders([]);
    } finally {
      setLabsProvidersLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
    loadEncounter();
    loadIndependentLabs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounterId]);

  // ✅ Reload catalog when outsourced lab changes
  useEffect(() => {
    if (outsourcedToUserId) setWantsOutsource(true);
    loadCatalog(q);
    // Clear selections when switching catalogs
    setSelectedCodes(new Set());
    setSelectedMeta({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outsourcedToUserId]);

  useEffect(() => {
    const t = setTimeout(() => loadCatalog(q), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

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
      router.push(`/provider/encounters/${encounterId}/workflow/clinical`);
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

    // ✅ Validate outsourcing intent
    if ((isIndependentProvider || wantsOutsource) && !outsourcedToUserId) {
      setError(
        isIndependentProvider
          ? "Select a lab scientist to outsource to (independent providers should not run labs without a lab scientist)."
          : "Select a lab scientist to outsource to, or switch back to your catalog."
      );
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

      router.push(`/provider/encounters/${encounterId}/workflow/waiting-labs`);
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
              href="/provider/encounters"
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
  const isIndependentEncounter = !encounter?.facility_id;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Link
              href={`/provider/encounters/${encounterId}`}
              className="inline-flex items-center gap-2 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Encounter
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-slate-800">Labs</span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">Order Labs</h1>
            {isIndependentEncounter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                <UserRound className="h-3 w-3" />
                Independent
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {patientLabel} • Encounter #{encounterId}
          </p>
        </div>

        <button
          onClick={handleSkipLabs}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-60"
          title="Skip labs and go straight to SOAP note"
        >
          <AlertTriangle className="h-4 w-4" />
          Skip Labs
        </button>
      </div>

      {/* ✅ Independent provider hint banner */}
      {isIndependentProvider && (
        <div className="mb-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <Info className="h-4 w-4 text-blue-700" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-900">Independent Provider Tip</h3>
              <p className="mt-1 text-sm text-blue-800">
                Select a lab scientist below to see their test catalog and outsource lab work. 
                This ensures proper sample collection and result reporting.
              </p>
            </div>
          </div>
        </div>
      )}

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

      <form onSubmit={handleOrderLabs} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: Catalog */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Beaker className="h-5 w-5 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900">
                {selectedProvider ? `${getProviderDisplayName(selectedProvider)}'s Test Catalog` : "Test Catalog"}
              </h2>
            </div>

            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by code or name…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
              />
            </div>
          </div>

          {/* ✅ Catalog source indicator with full provider details */}
          {selectedProvider && (
            <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-700 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-blue-900">
                    Showing tests from <strong>{getProviderDisplayName(selectedProvider)}</strong>'s catalog
                  </div>
                  {getProviderDetails(selectedProvider) && (
                    <div className="mt-1 text-xs text-blue-800">
                      {getProviderDetails(selectedProvider)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!selectedProvider && isIndependentProvider && catalog.length === 0 && !catalogLoading && (
            <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                Select a lab scientist below to see their test catalog
              </div>
            </div>
          )}

          {catalogError ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {catalogError}
            </div>
          ) : null}

          <div className="mt-3 rounded-xl border border-slate-100">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 w-10"></th>
                    <th className="px-3 py-2">Test</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {catalogLoading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-slate-600">
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
                          <td className="px-3 py-2 text-slate-900">{t?.name || "—"}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">{code || "—"}</td>
                          <td className="px-3 py-2 text-slate-700">{t?.unit || "—"}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-slate-600">
                        {selectedProvider 
                          ? `${getProviderDisplayName(selectedProvider)} has no tests in their catalog yet.`
                          : isIndependentProvider
                          ? "Select a lab scientist to see their test catalog."
                          : "No tests found."}
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
              <div className="text-sm font-semibold text-slate-900">Manual Test Requests</div>
              <div className="text-xs text-slate-600">Use when the test is not in the catalog</div>
            </div>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder='Type a test (e.g., "Folate", "D-dimer", "HbA1c")'
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
              <div className="mt-2 text-xs text-slate-600">No manual tests added.</div>
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
                        Estimated total: <span className="font-semibold text-slate-900">₦{selectionSummary.estTotal.toLocaleString()}</span>
                        {selectionSummary.manualCount ? <span className="text-slate-500"> (manual tests not priced)</span> : null}
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
                      setWantsOutsource(isIndependentProvider ? true : false);
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

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Catalog</div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-900">{selectionSummary.catalogCount}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Manual</div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-900">{selectionSummary.manualCount}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Route</div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-900">
                    {wantsOutsource
                      ? outsourcedToUserId
                        ? "Lab scientist"
                        : "Select lab scientist"
                      : isIndependentProvider
                      ? "Outsourced"
                      : "Default"}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Processing</div>
                <div className={isIndependentProvider ? "mt-2 grid grid-cols-1 gap-2" : "mt-2 grid grid-cols-2 gap-2"}>
                  {!isIndependentProvider ? (
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
                      <div className="font-semibold text-slate-900">Default Catalog</div>
                      <div className="mt-0.5 text-xs text-slate-600">Use non-outsourced catalog</div>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setWantsOutsource(true)}
                    className={
                      wantsOutsource
                        ? "rounded-xl border border-slate-900 bg-white px-3 py-2 text-left text-sm shadow-sm"
                        : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:bg-slate-50"
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-700" />
                        <div className="font-semibold text-slate-900">Outsourced Catalog</div>
                      </div>
                      {isIndependentProvider ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Required
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">Select a lab scientist to view their catalog</div>
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
                      <option value="">— Select lab scientist —</option>
                      {labsProviders.map((p) => (
                        <option key={String(p?.user)} value={String(p?.user)}>
                          {getProviderDisplayName(p)}
                        </option>
                      ))}
                    </select>

                    {!outsourcedToUserId ? (
                      <div className="mt-2 text-xs text-slate-600">
                        Pick a lab scientist to switch the catalog and route this order.
                      </div>
                    ) : null}

                    {selectedProvider ? (
                      <div className="mt-2 space-y-1 rounded-lg border border-slate-200 bg-white p-2 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                          <Building2 className="h-3.5 w-3.5" />
                          {getProviderDisplayName(selectedProvider)}
                        </div>
                        {selectedProvider.address ? (
                          <div className="flex items-start gap-1.5 text-slate-600">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                            <span>{selectedProvider.address}</span>
                          </div>
                        ) : null}
                        {selectedProvider.phone ? (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{selectedProvider.phone}</span>
                          </div>
                        ) : null}
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
                placeholder="Optional clinical context for lab…"
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
              SOAP Note
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}