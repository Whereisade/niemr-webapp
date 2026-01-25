"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import BedAssignmentModal from "@/components/wards/BedAssignmentModal";
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
  Bed,
  BellRing,
  MapPin,
  RefreshCw,
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
  // Priority: display_name (includes business_name) > constructed name > email
  if (p?.display_name) {
    return p.display_name;
  }
  const n = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim();
  return n || p?.email || `#${p?.id || "—"}`;
}

// 🆕 Format address from provider profile
function formatAddress(p) {
  if (!p) return "";
  const parts = [p?.lga, p?.state].filter(Boolean);
  return parts.length ? parts.join(", ") : (p?.address || "").substring(0, 40);
}

export default function FacilityEncounterPrescriptionPage() {
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
  const [catalogSource, setCatalogSource] = useState("facility"); // 🆕 Track catalog source

  // Outsource pharmacy
  const [pharmProviders, setPharmProviders] = useState([]);
  const [pharmLoading, setPharmLoading] = useState(false);
  const [outsourcedToUserId, setOutsourcedToUserId] = useState(""); // user id

  // Items
  const [items, setItems] = useState([]);
  const [freeTextName, setFreeTextName] = useState("");

  // Meta
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [admitSending, setAdmitSending] = useState(false);
  const [success, setSuccess] = useState("");

  // Bed assignment modal state
  const [showBedModal, setShowBedModal] = useState(false);
  const [bedAssignment, setBedAssignment] = useState(null);

  // 🆕 Selected provider for display
  const selectedProvider = useMemo(() => {
    if (!outsourcedToUserId) return null;
    return pharmProviders.find((p) => String(p?.user) === String(outsourcedToUserId)) || null;
  }, [outsourcedToUserId, pharmProviders]);

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

    // Check if patient already has a bed assignment
    if (data?.patient) {
      try {
        const assignments = await apiFetch(
          `/facilities/bed-assignments/?patient=${data.patient}&active=true`
        );
        const activeAssignment = normalizeList(assignments)?.[0];
        if (activeAssignment) {
          setBedAssignment(activeAssignment);
        }
      } catch (err) {
        console.error("Failed to check bed assignment:", err);
      }
    }
  }

  // 🆕 Enhanced loadCatalog with source and userId parameters
  async function loadCatalog(search = "", source = "facility", userId = null) {
    setCatalogError("");
    setCatalogLoading(true);
    setCatalogSource(source);
    
    try {
      const params = new URLSearchParams();
      
      if (search?.trim()) {
        params.set("s", search.trim());
      }
      
      // 🔥 Pass created_by parameter for outsourced catalog
      if (source === "outsourced" && userId) {
        params.set("created_by", String(userId));
      }
      
      const qs = params.toString();
      const url = qs ? `/pharmacy/catalog/?${qs}` : "/pharmacy/catalog/";
      
      console.log(`[loadCatalog] Fetching: ${url}`); // Debug log
      
      const res = await apiFetch(url, { method: "GET" });
      const drugs = normalizeList(res);
      
      setCatalog(drugs);
      
      console.log(`[loadCatalog] Success: ${drugs.length} drugs loaded`); // Debug log
    } catch (err) {
      setCatalogError(err?.message || "Failed to load drug catalog.");
      setCatalog([]);
      
      console.error(`[loadCatalog] Error:`, err); // Debug log
    } finally {
      setCatalogLoading(false);
    }
  }

  async function loadIndependentPharmacy() {
    setPharmLoading(true);
    try {
      const res = await apiFetch(
        "/providers/?facility=none&type=PHARMACIST&page=1&limit=50",
        { method: "GET" }
      );
      const providers = normalizeList(res);
      setPharmProviders(providers);
      
      console.log(`[loadIndependentPharmacy] Loaded ${providers.length} independent pharmacies`); // Debug log
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
          await Promise.all([loadCatalog("", "facility"), loadIndependentPharmacy()]);
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

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      loadCatalog(q, catalogSource, outsourcedToUserId || null);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // 🔥 Auto-reload catalog when outsourced pharmacy changes
  useEffect(() => {
    if (outsourcedToUserId) {
      console.log(`[useEffect] Outsourced pharmacy changed to user ID: ${outsourcedToUserId}`); // Debug log
      setQ("");
      loadCatalog("", "outsourced", outsourcedToUserId);
    } else {
      console.log('[useEffect] Outsource cleared, loading facility catalog'); // Debug log
      setQ("");
      loadCatalog("", "facility");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outsourcedToUserId]);

  const role = String(me?.role || "").toUpperCase();
  const canEdit = useMemo(() => ["DOCTOR", "ADMIN", "SUPER_ADMIN"].includes(role), [role]);

  const isLocked = Boolean(encounter?.locked || encounter?.locked_at);
  const isWaitingLabs = String(encounter?.status || "").toUpperCase() === "WAITING_LABS";
  const isCrossedOut = String(encounter?.status || "").toUpperCase() === "CROSSED_OUT";
  const isClosed = String(encounter?.status || "").toUpperCase() === "CLOSED";
  const readOnly = !canEdit || isLocked || isWaitingLabs || isCrossedOut;

  async function handleRequestWardAdmission() {
    if (!encounterId) return;
    setError("");
    setSuccess("");

    if (!canEdit) {
      setError("Only doctors (or admins) can request ward admission.");
      return;
    }
    if (isClosed || isCrossedOut) {
      setError("This encounter is closed/crossed out.");
      return;
    }
    if (!encounter?.patient) {
      setError("This encounter does not have a patient linked.");
      return;
    }

    setAdmitSending(true);
    try {
      await apiFetch(`/encounters/${encounterId}/request_admission/`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setSuccess("Ward admission request sent to nursing staff.");
    } catch (err) {
      setError(err?.message || "Failed to send ward admission request.");
    } finally {
      setAdmitSending(false);
    }
  }

  function addCatalogDrug(drug) {
    const code = String(drug?.code || "").trim();
    if (!code) return;

    setItems((prev) => {
      // Allow duplicates if intentionally needed? keep it simple: de-dupe by code + dose/freq (initially empty)
      if (prev.some((x) => String(x?.drug_code) === code && !x?.drug_name)) return prev;
      return [
        ...prev,
        {
          drug_code: code,
          drug_name: drug?.name || "", // 🆕 Auto-fill drug name too
          dose: drug?.strength || "", // 🆕 Auto-fill dose from catalog drug strength
          frequency: "",
          duration_days: "", // Empty by default - let doctor input
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
        duration_days: "", // Empty by default - let doctor input
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
        duration_days: it?.duration_days ? Number(it?.duration_days) : null,
        qty_prescribed: 0, // Set to 0 - pharmacist will handle this
        instruction: it?.instruction || "",
      };
    });

    // Minimal validation
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
      // Optional redirect back to encounter after short tick
      setTimeout(() => {
        router.push(`/facility/encounters/${encounterId}`);
      }, 600);
    } catch (err) {
      setError(err?.message || "Failed to create prescription.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleBedAssignmentSuccess(assignment) {
    setBedAssignment(assignment);
    setSuccess("Bed assigned successfully!");
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
              href={`/facility/encounters/${encounterId}`}
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

  const patientName = encounter?.patient_name || 
    (encounter?.patient_first_name || encounter?.patient_last_name
      ? `${encounter?.patient_first_name || ""} ${encounter?.patient_last_name || ""}`.trim()
      : "") ||
    `Patient #${encounter?.patient || "—"}`;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
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
            <span className="font-medium text-slate-800">Prescription</span>
          </div>

          <h1 className="mt-2 text-xl font-semibold text-slate-900">
            Prescription
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Encounter #{encounterId} • {patientName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRequestWardAdmission}
            disabled={admitSending || !encounter?.patient || !canEdit || isClosed || isCrossedOut}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-60"
          >
            {admitSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BellRing className="h-4 w-4" />
            )}
            Admit to Ward
          </button>

          {/* Bed Assignment Status/Button */}
          {bedAssignment ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
              <Bed className="h-4 w-4 text-emerald-700" />
              <span className="text-emerald-900">
                Bed: {bedAssignment.bed_display || `#${bedAssignment.bed}`}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowBedModal(true)}
              disabled={!encounter?.patient}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-60"
            >
              <Bed className="h-4 w-4" />
              Assign Bed
            </button>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || readOnly}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Pill className="h-4 w-4" />
            )}
            Create Prescription
          </button>
        </div>
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
          This encounter is currently read-only (locked / waiting labs / crossed
          out / insufficient role).
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Catalog */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900">
                Drug Catalog
              </h2>
              {/* 🆕 Catalog source indicator */}
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

          {/* 🆕 Info banner when viewing outsourced catalog */}
          {catalogSource === "outsourced" && selectedProvider ? (
            <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-sky-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-sky-800">
                  <div className="font-medium">Viewing outsourced pharmacy catalog</div>
                  <div className="mt-1 text-xs">
                    You're browsing drugs from <span className="font-semibold">{fullName(selectedProvider)}</span>.
                    Add drugs to the prescription builder. To return to facility catalog, clear the outsource selection below.
                  </div>
                </div>
              </div>
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
                          Loading catalog…
                        </span>
                      </td>
                    </tr>
                  ) : catalog.length ? (
                    catalog.map((d) => (
                      <tr key={String(d?.code)} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-900">
                          {d?.name || "—"}{" "}
                          <span className="text-xs text-slate-500">
                            {d?.strength || ""}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700">
                          {d?.code || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {[d?.form, d?.route].filter(Boolean).join(" • ") ||
                            "—"}
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
                      <td colSpan={4} className="px-3 py-8 text-center text-slate-600">
                        {catalogSource === "outsourced" ? (
                          <div>
                            <div className="font-medium text-slate-900">No drugs found in this pharmacy's catalog</div>
                            <div className="mt-2 text-xs text-slate-600">
                              The selected pharmacy ({fullName(selectedProvider) || "Unknown"}) may not have any drugs configured yet.
                            </div>
                          </div>
                        ) : (
                          "No drugs found."
                        )}
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
                placeholder={'Type a medication name (e.g., "Coartem 20/120")'}
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
          <h2 className="text-sm font-semibold text-slate-900">
            Prescription Builder
          </h2>

          <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Building2 className="h-4 w-4" />
              Outsource to Independent Pharmacy
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Optional. If not selected, prescription stays in the facility
              pharmacy workflow.
            </p>

            <div className="mt-2">
              <select
                value={outsourcedToUserId}
                onChange={(e) => setOutsourcedToUserId(e.target.value)}
                disabled={pharmLoading || readOnly}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:opacity-60"
              >
                <option value="">— Do not outsource —</option>
                {pharmProviders.map((p) => {
                  const name = fullName(p);
                  const addr = formatAddress(p); // 🆕 Get address
                  return (
                    <option key={String(p?.user)} value={String(p?.user)}>
                      {name}{addr ? ` • ${addr}` : ""}
                    </option>
                  );
                })}
              </select>
              
              {/* 🆕 Show selected provider details */}
              {selectedProvider ? (
                <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                  <div className="text-xs">
                    <div className="font-semibold text-slate-900">{fullName(selectedProvider)}</div>
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
                    <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                      User ID: {selectedProvider?.user || "N/A"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setQ("");
                      loadCatalog("", "outsourced", outsourcedToUserId);
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reload catalog
                  </button>
                </div>
              ) : null}
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
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-100 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {it?.drug_code ? (
                          <>
                            <span className="text-xs">
                              {it.drug_name || catalog.find((d) => String(d?.code) === String(it.drug_code))?.name || it.drug_code}
                            </span>
                          </>
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
                      onChange={(e) =>
                        updateItem(idx, { dose: e.target.value })
                      }
                      placeholder="Dose (e.g., 500mg, 10mL)"
                      disabled={readOnly}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={it?.frequency || ""}
                        onChange={(e) =>
                          updateItem(idx, { frequency: e.target.value })
                        }
                        placeholder="Frequency (e.g., bd, tds)"
                        disabled={readOnly}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                      />
                      <input
                        value={String(it?.duration_days ?? "")}
                        onChange={(e) =>
                          updateItem(idx, { duration_days: e.target.value })
                        }
                        placeholder="Duration (days)"
                        disabled={readOnly}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                      />
                    </div>

                    <input
                      value={it?.instruction || ""}
                      onChange={(e) =>
                        updateItem(idx, { instruction: e.target.value })
                      }
                      placeholder="Instruction (e.g., After meals)"
                      disabled={readOnly}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                    />
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
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Pill className="h-4 w-4" />
            )}
            Create Prescription
          </button>

          <Link
            href={`/facility/encounters/${encounterId}`}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Back to Encounter
          </Link>
        </div>
      </div>

      {/* Bed Assignment Modal */}
      <BedAssignmentModal
        isOpen={showBedModal}
        onClose={() => setShowBedModal(false)}
        patientId={encounter?.patient}
        patientName={patientName}
        encounterId={encounterId}
        onSuccess={handleBedAssignmentSuccess}
      />
    </div>
  );
}
