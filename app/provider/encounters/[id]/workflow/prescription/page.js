"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  Loader2,
  Pill,
  Search,
  Plus,
  Trash2,
  Building2,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

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

export default function ProviderEncounterPrescriptionPage() {
  const params = useParams();
  const router = useRouter();
  const encounterId = params?.id;

  const [encounter, setEncounter] = useState(null);
  const [me, setMe] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Catalog
  const [q, setQ] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");

  // Outsource pharmacy (single target for entire prescription)
  const [pharmProviders, setPharmProviders] = useState([]);
  const [pharmLoading, setPharmLoading] = useState(false);
  const [outsourcedToUserId, setOutsourcedToUserId] = useState("");

  // Items
  const [items, setItems] = useState([]);
  const [freeTextName, setFreeTextName] = useState("");

  // Meta
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

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
    const data = await apiFetch(`/encounters/${encounterId}/`, { method: "GET" });
    setEncounter(data);
  }

  async function loadCatalog(search = "") {
    setCatalogError("");
    setCatalogLoading(true);
    try {
      const qs = search?.trim() ? `?s=${encodeURIComponent(search.trim())}` : "";
      const res = await apiFetch(`/pharmacy/catalog/${qs}`, { method: "GET" });
      setCatalog(normalizeList(res));
    } catch (err) {
      setCatalogError(err?.message || "Failed to load drug catalog.");
      setCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  }

  async function loadIndependentPharmacy() {
    setPharmLoading(true);
    try {
      const res = await apiFetch(
        "/providers/?facility=none&type=PHARMACY&page=1&limit=50",
        { method: "GET" }
      );
      setPharmProviders(normalizeList(res));
    } catch {
      setPharmProviders([]);
    } finally {
      setPharmLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        await Promise.all([loadMe(), loadEncounter()]);
        if (!cancelled) {
          await Promise.all([loadCatalog(""), loadIndependentPharmacy()]);
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load prescription workflow.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounterId]);

  useEffect(() => {
    const t = setTimeout(() => loadCatalog(q), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const role = String(me?.role || "").toUpperCase();
  const canEdit = useMemo(() => ["DOCTOR", "ADMIN", "SUPER_ADMIN"].includes(role), [role]);

  const isLocked = Boolean(encounter?.locked || encounter?.locked_at);
  const isWaitingLabs = String(encounter?.status || "").toUpperCase() === "WAITING_LABS";
  const isCrossedOut = String(encounter?.status || "").toUpperCase() === "CROSSED_OUT";
  const readOnly = !canEdit || isLocked || isWaitingLabs || isCrossedOut;

  function addCatalogDrug(drug) {
    const code = String(drug?.code || "").trim();
    if (!code) return;

    setItems((prev) => {
      if (prev.some((x) => String(x?.drug_code) === code && !x?.drug_name)) return prev;
      return [
        ...prev,
        {
          drug_code: code,
          drug_name: "",
          dose: "",
          frequency: "",
          duration_days: 1,
          qty_prescribed: 0,
          instruction: "",
        },
      ];
    });
  }

  function addFreeTextDrug() {
    const v = (freeTextName || "").trim();
    if (!v) return;

    setItems((prev) => [
      ...prev,
      {
        drug_code: "",
        drug_name: v,
        dose: "",
        frequency: "",
        duration_days: 1,
        qty_prescribed: 0,
        instruction: "",
      },
    ]);
    setFreeTextName("");
  }

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!encounterId) return;
    setError("");
    setSuccess("");

    if (!canEdit) {
      setError("Only doctors (or admins) can create prescriptions from this workflow.");
      return;
    }
    if (readOnly) {
      setError("This encounter is currently read-only.");
      return;
    }

    const patientId = encounter?.patient;
    if (!patientId) {
      setError("This encounter does not have a patient linked.");
      return;
    }

    if (!items.length) {
      setError("Add at least one medication item (catalog or free-text).");
      return;
    }

    const payloadItems = items.map((it) => {
      const drug_code = (it?.drug_code || "").trim();
      const drug_name = (it?.drug_name || "").trim();

      return {
        ...(drug_code ? { drug_code } : {}),
        ...(drug_code ? {} : { drug_name }),
        dose: it?.dose || "",
        frequency: it?.frequency || "",
        duration_days: Number(it?.duration_days || 1),
        qty_prescribed: Number(it?.qty_prescribed || 0),
        instruction: it?.instruction || "",
      };
    });

    const bad = payloadItems.find((x) => (!x.drug_code && !x.drug_name) || !String(x.dose || "").trim());
    if (bad) {
      setError("Each medication must have either a catalog drug_code or free-text drug_name, and a dose.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/pharmacy/prescriptions/", {
        method: "POST",
        body: JSON.stringify({
          patient: patientId,
          encounter_id: Number(encounterId),
          note,
          outsourced_to: outsourcedToUserId ? Number(outsourcedToUserId) : null,
          items: payloadItems,
        }),
      });

      setSuccess("Prescription created successfully.");
      setTimeout(() => {
        router.push(`/provider/encounters/${encounterId}`);
      }, 600);
    } catch (err) {
      setError(err?.message || "Failed to create prescription.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-slate-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  if (error && !encounter) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <div className="font-semibold">Could not open prescription workflow</div>
          <div className="mt-1 text-sm">{error}</div>
          <div className="mt-3">
            <Link
              href={`/provider/encounters/${encounterId}`}
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Encounter
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            <span className="font-medium text-slate-800">Prescription</span>
          </div>

          <h1 className="mt-2 text-xl font-semibold text-slate-900">Prescription</h1>
          <p className="mt-1 text-sm text-slate-600">
            Encounter #{encounterId} • Patient #{encounter?.patient || "—"}
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || readOnly}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pill className="h-4 w-4" />}
          Create Prescription
        </button>
      </div>

      {success ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <div className="inline-flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {!canEdit ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Only doctors (or admins) can create prescriptions.
        </div>
      ) : null}

      {readOnly ? (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900">
          This encounter is currently read-only (locked / waiting labs / crossed out / insufficient role).
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Catalog */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900">Drug Catalog</h2>
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
            <div className="max-h-[360px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Drug</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Form</th>
                    <th className="px-3 py-2 w-24">Add</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {catalogLoading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-slate-600">
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading…
                        </span>
                      </td>
                    </tr>
                  ) : catalog.length ? (
                    catalog.map((d) => (
                      <tr key={String(d?.code)} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-900">
                          {d?.name || "—"}{" "}
                          <span className="text-xs text-slate-500">{d?.strength || ""}</span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700">
                          {d?.code || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {[d?.form, d?.route].filter(Boolean).join(" • ") || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => addCatalogDrug(d)}
                            disabled={readOnly}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                          >
                            <Plus className="h-4 w-4" />
                            Add
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-slate-600">
                        No drugs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Free-text medication */}
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-900">
              Free-text Medication Entry
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Use only if the drug is not in the catalog.
            </p>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                value={freeTextName}
                onChange={(e) => setFreeTextName(e.target.value)}
                placeholder='Type a medication name (e.g., “Coartem 20/120”)'
                disabled={readOnly}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
              />
              <button
                type="button"
                onClick={addFreeTextDrug}
                disabled={readOnly}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Builder */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Prescription Builder</h2>

          <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Building2 className="h-4 w-4" />
              Outsource to Independent Pharmacy
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Optional. One pharmacy gets the entire prescription.
            </p>

            <div className="mt-2">
              <select
                value={outsourcedToUserId}
                onChange={(e) => setOutsourcedToUserId(e.target.value)}
                disabled={pharmLoading || readOnly}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:opacity-60"
              >
                <option value="">— Do not outsource —</option>
                {pharmProviders.map((p) => (
                  <option key={String(p?.user)} value={String(p?.user)}>
                    {fullName(p)} (User #{p?.user})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="mt-3 grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Note
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              disabled={readOnly}
              placeholder="Optional instruction to pharmacy…"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
            />
          </label>

          <div className="mt-4 space-y-3">
            {items.length ? (
              items.map((it, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {it?.drug_code ? (
                          <span className="font-mono text-xs">{it.drug_code}</span>
                        ) : (
                          it?.drug_name || "Free-text"
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        {it?.drug_code ? "Catalog drug" : "Free-text entry"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={readOnly}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2">
                    <input
                      value={it?.dose || ""}
                      onChange={(e) => updateItem(idx, { dose: e.target.value })}
                      placeholder="Dose (e.g., 500mg, 10mL)"
                      disabled={readOnly}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={it?.frequency || ""}
                        onChange={(e) => updateItem(idx, { frequency: e.target.value })}
                        placeholder="Frequency (e.g., bd, tds)"
                        disabled={readOnly}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                      />
                      <input
                        value={String(it?.duration_days ?? 1)}
                        onChange={(e) => updateItem(idx, { duration_days: e.target.value })}
                        placeholder="Duration (days)"
                        disabled={readOnly}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={String(it?.qty_prescribed ?? 0)}
                        onChange={(e) => updateItem(idx, { qty_prescribed: e.target.value })}
                        placeholder="Qty prescribed"
                        disabled={readOnly}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                      />
                      <input
                        value={it?.instruction || ""}
                        onChange={(e) => updateItem(idx, { instruction: e.target.value })}
                        placeholder="Instruction (optional)"
                        disabled={readOnly}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                No items yet. Add drugs from the catalog or via free-text.
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || readOnly}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pill className="h-4 w-4" />}
            Create Prescription
          </button>

          <Link
            href={`/provider/encounters/${encounterId}`}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Back to Encounter
          </Link>
        </div>
      </div>
    </div>
  );
}
