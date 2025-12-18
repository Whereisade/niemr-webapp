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
  const n = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim();
  return n || p?.email || `#${p?.id || "—"}`;
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
  const [manualName, setManualName] = useState("");
  const [manualTests, setManualTests] = useState([]);

  // Outsource
  const [labsProviders, setLabsProviders] = useState([]);
  const [labsProvidersLoading, setLabsProvidersLoading] = useState(false);
  const [outsourcedToUserId, setOutsourcedToUserId] = useState(""); // user id (p.user)

  // Order meta
  const [priority, setPriority] = useState("ROUTINE");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);

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

  async function loadCatalog(search = "") {
    setCatalogError("");
    setCatalogLoading(true);
    try {
      const qs = search?.trim() ? `?s=${encodeURIComponent(search.trim())}` : "";
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
        "/providers/?facility=none&type=LAB&page=1&limit=50",
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
    loadCatalog("");
    loadIndependentLabs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounterId]);

  useEffect(() => {
    const t = setTimeout(() => loadCatalog(q), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const canDoctorActions = useMemo(() => {
    const role = String(me?.role || "").toUpperCase();
    return ["DOCTOR", "ADMIN", "SUPER_ADMIN"].includes(role);
  }, [me]);

  function toggleCode(code) {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      const k = String(code);
      if (next.has(k)) next.delete(k);
      else next.add(k);
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

          <h1 className="mt-2 text-xl font-semibold text-slate-900">Order Labs</h1>
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
              <h2 className="text-sm font-semibold text-slate-900">Test Catalog</h2>
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
                      <td colSpan={4} className="px-3 py-4 text-slate-600">
                        No tests found.
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
                placeholder='Type a test (e.g., “Folate”, “D-dimer”, “HbA1c”)'
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

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Building2 className="h-4 w-4" />
                Outsource to Independent Lab
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Optional. Recommended for independent providers (so labs are routed to a lab scientist).
              </p>

              <div className="mt-2">
                <select
                  value={outsourcedToUserId}
                  onChange={(e) => setOutsourcedToUserId(e.target.value)}
                  disabled={labsProvidersLoading}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:opacity-60"
                >
                  <option value="">— Do not outsource —</option>
                  {labsProviders.map((p) => (
                    <option key={String(p?.user)} value={String(p?.user)}>
                      {fullName(p)} (User #{p?.user})
                    </option>
                  ))}
                </select>

                {selectedProvider ? (
                  <div className="mt-2 text-xs text-slate-600">
                    Selected:{" "}
                    <span className="font-medium text-slate-800">
                      {fullName(selectedProvider)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !canDoctorActions}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Beaker className="h-4 w-4" />}
              Order Labs (Pause Encounter)
            </button>

            <button
              type="button"
              onClick={handleSkipLabs}
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
            >
              Skip Labs → SOAP Note
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
