"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { createLabOrder } from "@/lib/labsActions";
import {
  FlaskConical,
  User,
  AlertCircle,
  Zap,
  FileText,
  Building2,
  Plus,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";

const PRIORITY_OPTIONS = [
  { value: "ROUTINE", label: "Routine", icon: "📋", color: "slate" },
  { value: "URGENT", label: "Urgent", icon: "⚡", color: "amber" },
  { value: "STAT", label: "Stat", icon: "🚨", color: "rose" },
];

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (data && typeof data === "object") return Object.values(data);
  return [];
}

export default function ProviderNewLabOrderPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);

  const [patientId, setPatientId] = useState("");
  const [externalLabName, setExternalLabName] = useState("");
  const [outsourcedTo, setOutsourcedTo] = useState("");
  const [externalLabs, setExternalLabs] = useState([]);
  const [loadingLabs, setLoadingLabs] = useState(true);
  const [labsError, setLabsError] = useState("");
  const [priority, setPriority] = useState("ROUTINE");
  const [notes, setNotes] = useState("");

  // Lab catalog state (for LAB users AND doctors/nurses viewing outsourced lab catalogs)
  const [labCatalog, setLabCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [selectedTests, setSelectedTests] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedLabName, setSelectedLabName] = useState(""); // Track selected lab's business name

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      try {
        const res = await apiFetch("/accounts/me/", { method: "GET" });
        if (!cancelled) setMe(res);
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    }
    loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const meRole = String(me?.role || "").toUpperCase();
  const isIndependentLab = meRole === "LAB" && !me?.facility;
  const isDoctorOrNurse = ["DOCTOR", "NURSE"].includes(meRole);

  useEffect(() => {
    let cancelled = false;

    async function fetchPatients() {
      try {
        setLoadingPatients(true);
        const res = await apiFetch("/patients/?page=1&limit=50");
        if (cancelled) return;
        const items = normalizeList(res);
        setPatients(items);
      } catch (err) {
        console.error("Failed to load patients", err);
        if (!cancelled) setPatients([]);
      } finally {
        if (!cancelled) setLoadingPatients(false);
      }
    }

    fetchPatients();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load lab catalog for independent LAB users (their own catalog)
  useEffect(() => {
    if (!isIndependentLab) return;

    let cancelled = false;

    async function fetchCatalog() {
      setLoadingCatalog(true);
      setCatalogError("");

      try {
        const data = await apiFetch("/labs/catalog/");
        if (!cancelled) {
          setLabCatalog(normalizeList(data).filter((t) => t.is_active));
        }
      } catch (e) {
        if (!cancelled) {
          setCatalogError(e?.message || "Failed to load lab catalog.");
        }
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    }

    fetchCatalog();

    return () => {
      cancelled = true;
    };
  }, [isIndependentLab]);

  // Load external labs for doctors/nurses
  useEffect(() => {
    if (isIndependentLab) {
      setLoadingLabs(false);
      return;
    }

    let cancelled = false;

    async function fetchExternalLabs() {
      setLoadingLabs(true);
      setLabsError("");

      try {
        const data = await apiFetch("/providers/?facility=none&type=LAB_SCIENTIST");
        const list = normalizeList(data);
        if (!cancelled) setExternalLabs(list);
      } catch (e) {
        if (!cancelled) setLabsError(e?.message || "Failed to load external labs.");
      } finally {
        if (!cancelled) setLoadingLabs(false);
      }
    }

    fetchExternalLabs();

    return () => {
      cancelled = true;
    };
  }, [isIndependentLab]);

  // 🔥 NEW: Load external lab's catalog when doctor/nurse selects an external lab
  useEffect(() => {
    if (!isDoctorOrNurse || !outsourcedTo || outsourcedTo === "__other__") {
      // Clear catalog when no valid lab is selected
      setLabCatalog([]);
      setSelectedTests([]);
      return;
    }

    let cancelled = false;

    async function fetchOutsourcedCatalog() {
      setLoadingCatalog(true);
      setCatalogError("");

      try {
        // Fetch catalog using ?created_by parameter (backend already supports this)
        const data = await apiFetch(`/labs/catalog/?created_by=${outsourcedTo}`);
        if (!cancelled) {
          setLabCatalog(normalizeList(data).filter((t) => t.is_active));
          // Clear any previously selected tests when switching labs
          setSelectedTests([]);
        }
      } catch (e) {
        if (!cancelled) {
          setCatalogError(e?.message || "Failed to load external lab's catalog.");
          setLabCatalog([]);
        }
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    }

    fetchOutsourcedCatalog();

    return () => {
      cancelled = true;
    };
  }, [isDoctorOrNurse, outsourcedTo]);

  const handleAddTest = (test) => {
    if (selectedTests.some((t) => t.id === test.id)) return;
    setSelectedTests([...selectedTests, test]);
    setCatalogSearch("");
  };

  const handleRemoveTest = (testId) => {
    setSelectedTests(selectedTests.filter((t) => t.id !== testId));
  };

  const filteredCatalog = catalogSearch.trim()
    ? labCatalog.filter((t) => {
        const q = catalogSearch.toLowerCase();
        return (
          t.name?.toLowerCase().includes(q) ||
          t.code?.toLowerCase().includes(q)
        );
      })
    : labCatalog;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const patient = Number(patientId);
    if (!patient || Number.isNaN(patient)) {
      setError(
        !loadingPatients && patients.length === 0
          ? "No patients are available. Create a patient profile first."
          : "Please select a patient."
      );
      return;
    }

    // For independent LAB: must select tests from catalog
    if (isIndependentLab) {
      if (selectedTests.length === 0) {
        setError("Please select at least one test from your lab catalog.");
        return;
      }
    } else {
      // For doctors/nurses: must specify external lab
      if (!externalLabName.trim()) {
        setError("Please enter the external lab name or select from the list.");
        return;
      }

      // 🔥 NEW: If doctor selected tests from catalog, require them
      if (outsourcedTo && outsourcedTo !== "__other__" && labCatalog.length > 0 && selectedTests.length === 0) {
        setError("Please select at least one test from the external lab's catalog, or provide details in the clinical notes.");
      }
    }

    if (!notes.trim()) {
      setError("Please provide clinical notes.");
      return;
    }

    let resolvedOutsourcedTo = null;
    let resolvedExternalName = "";
    let items = [];

    if (isIndependentLab) {
      // Independent LAB creating for walk-in patient
      resolvedOutsourcedTo = null;
      resolvedExternalName = "";
      items = selectedTests.map((t) => ({ test_code: t.code }));
    } else {
      // Doctor/Nurse outsourcing to external lab
      const isOtherLab = outsourcedTo === "__other__";
      resolvedOutsourcedTo = outsourcedTo && !isOtherLab ? Number(outsourcedTo) : null;
      resolvedExternalName = externalLabName.trim();
      
      // 🔥 NEW: Include selected tests if any were chosen from catalog
      items = selectedTests.map((t) => ({ test_code: t.code }));
    }

    const payload = {
      patient,
      priority: priority || "ROUTINE",
      outsourced_to: resolvedOutsourcedTo,
      external_lab_name: resolvedExternalName,
      note: notes.trim(),
      items,
    };

    setIsSubmitting(true);
    try {
      await createLabOrder(payload);
      router.push("/provider/labs");
    } catch (err) {
      console.error("Create lab order failed", err);
      setError(err?.message || "Failed to create lab order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPriorityOption = PRIORITY_OPTIONS.find((p) => p.value === priority);

  // 🔥 FIXED: Helper to get business name from provider
  const getProviderDisplayName = (provider) => {
    // Priority: business_name > full_name > email
    if (provider?.business_name) return provider.business_name;
    
    const fullName = provider?.full_name || provider?.user_name;
    if (fullName) return fullName;
    
    return provider?.user_email || provider?.email || "External lab";
  };

  // Determine if catalog should be shown
  const shouldShowCatalog = isIndependentLab || (isDoctorOrNurse && outsourcedTo && outsourcedTo !== "__other__");

  return (
    <main className="mx-auto max-w-4xl p-6 md:p-10">
      {/* Header */}
      <header className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
          <FlaskConical className="h-3.5 w-3.5" />
          {isIndependentLab ? "Walk-In Lab Order" : "External Lab Request"}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
          New lab order
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {isIndependentLab
            ? "Create a lab order for your walk-in patient. Select tests from your catalog and provide clinical context."
            : "Request lab tests from an external laboratory. Select tests from their catalog or describe the tests needed in your clinical notes."}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-100">
              <AlertCircle className="h-4 w-4 text-rose-700" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-rose-900">
                Unable to create order
              </div>
              <div className="mt-1 text-sm text-rose-700">{error}</div>
            </div>
          </div>
        )}

        {/* Patient Selection */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
          <div className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50">
                <User className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Patient Information
                </h2>
                <p className="text-xs text-slate-500">
                  Select the patient for this lab order
                </p>
              </div>
            </div>

            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">
                {loadingPatients
                  ? "Loading patients…"
                  : patients.length
                  ? "— Select a patient —"
                  : "No patients found"}
              </option>
              {!loadingPatients &&
                patients.map((p) => {
                  const fullName = [p.first_name, p.last_name]
                    .filter(Boolean)
                    .join(" ");
                  const label = fullName || p.email || `Patient #${p.id}`;
                  return (
                    <option key={p.id} value={String(p.id)}>
                      {label}
                    </option>
                  );
                })}
            </select>
          </div>
        </section>

        {/* External Lab Selection (for doctors/nurses) */}
        {!isIndependentLab && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-600 via-orange-600 to-red-600" />
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50">
                  <Building2 className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    External Laboratory
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select where to send this lab request
                  </p>
                </div>
              </div>

              <select
                value={outsourcedTo}
                onChange={(e) => {
                  const v = e.target.value;
                  setOutsourcedTo(v);

                  if (!v || v === "__other__") {
                    setExternalLabName("");
                    setSelectedLabName("");
                    return;
                  }

                  const selected = externalLabs.find(
                    (lab) =>
                      String(lab?.user ?? lab?.user_id ?? "") === String(v)
                  );

                  if (selected) {
                    // 🔥 FIXED: Use business name priority
                    const displayName = getProviderDisplayName(selected);
                    setExternalLabName(displayName);
                    setSelectedLabName(displayName);
                  }
                }}
                disabled={loadingLabs}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
              >
                <option value="">
                  {loadingLabs ? "Loading labs..." : "— Select external lab —"}
                </option>
                {externalLabs.map((lab) => {
                  const value = String(lab?.user ?? lab?.user_id ?? "");
                  // 🔥 FIXED: Display business name
                  const displayName = getProviderDisplayName(lab);

                  return (
                    <option key={value || displayName} value={value}>
                      {displayName}
                    </option>
                  );
                })}
                <option value="__other__">Other (enter name manually)</option>
              </select>

              {outsourcedTo === "__other__" && (
                <input
                  type="text"
                  value={externalLabName}
                  onChange={(e) => setExternalLabName(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Enter external lab name"
                />
              )}

              {labsError && (
                <p className="mt-2 text-xs text-red-600">{labsError}</p>
              )}
            </div>
          </section>
        )}

        {/* Lab Catalog Selection (for independent LAB users OR doctors viewing external lab catalog) */}
        {shouldShowCatalog && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600" />
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50">
                  <FlaskConical className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {isIndependentLab 
                      ? "Tests to Perform" 
                      : `Tests from ${selectedLabName || "External Lab"}`}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isIndependentLab
                      ? "Select tests from your lab catalog"
                      : "Select specific tests or describe them in clinical notes below"}
                  </p>
                </div>
              </div>

              {catalogError && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {catalogError}
                </div>
              )}

              {/* Selected Tests */}
              {selectedTests.length > 0 && (
                <div className="mb-4 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Selected Tests ({selectedTests.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTests.map((test) => (
                      <div
                        key={test.id}
                        className="group flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 pl-3 pr-2 py-1.5 shadow-sm transition hover:border-emerald-300"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-emerald-900">
                            {test.code}
                          </span>
                          <span className="text-xs text-emerald-700">
                            {test.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTest(test.id)}
                          className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-700 transition hover:bg-emerald-200 hover:text-emerald-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Catalog Search */}
              <div className="mb-3">
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search tests by name or code…"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Available Tests */}
              {loadingCatalog ? (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading catalog…
                </div>
              ) : filteredCatalog.length > 0 ? (
                <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {filteredCatalog.slice(0, 10).map((test) => {
                    const isSelected = selectedTests.some((t) => t.id === test.id);
                    return (
                      <button
                        key={test.id}
                        type="button"
                        onClick={() => handleAddTest(test)}
                        disabled={isSelected}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                          isSelected
                            ? "border-emerald-200 bg-emerald-50/50 opacity-60"
                            : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-semibold text-slate-900">
                              {test.code}
                            </span>
                            <span className="text-xs text-slate-600">
                              {test.name}
                            </span>
                          </div>
                          {test.unit && (
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              Unit: {test.unit}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {test.price > 0 && (
                            <span className="text-xs font-medium text-slate-700">
                              ₦{Number(test.price).toLocaleString()}
                            </span>
                          )}
                          {isSelected ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Plus className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {filteredCatalog.length > 10 && (
                    <div className="px-3 py-2 text-center text-xs text-slate-500">
                      +{filteredCatalog.length - 10} more tests. Refine your
                      search to see them.
                    </div>
                  )}
                </div>
              ) : catalogSearch ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                  No tests match "{catalogSearch}"
                </div>
              ) : labCatalog.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                  {isIndependentLab ? (
                    <>
                      Your lab catalog is empty. Add tests in{" "}
                      <a
                        href="/provider/labs/catalog"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        Lab Catalog
                      </a>
                      .
                    </>
                  ) : (
                    <>
                      This external lab has no tests in their catalog.
                      Please describe the required tests in the clinical notes below.
                    </>
                  )}
                </div>
              ) : null}

              {/* Helper text for doctors/nurses */}
              {!isIndependentLab && labCatalog.length > 0 && (
                <p className="mt-3 text-xs text-slate-600 italic">
                  💡 You can select tests from this lab's catalog, or describe custom tests in your clinical notes below.
                </p>
              )}
            </div>
          </section>
        )}

        {/* Priority */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 w-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600" />
          <div className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50">
                <Zap className="h-5 w-5 text-violet-700" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Priority Level
                </h2>
                <p className="text-xs text-slate-500">
                  How urgent is this lab order?
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={`rounded-xl border-2 px-4 py-3 text-left transition ${
                    priority === opt.value
                      ? `border-${opt.color}-500 bg-${opt.color}-50`
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{opt.icon}</span>
                    <div>
                      <div
                        className={`text-sm font-semibold ${
                          priority === opt.value
                            ? `text-${opt.color}-900`
                            : "text-slate-900"
                        }`}
                      >
                        {opt.label}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Clinical Notes */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 w-full bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800" />
          <div className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50">
                <FileText className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Clinical Notes
                </h2>
                <p className="text-xs text-slate-500">
                  {isIndependentLab
                    ? "Describe the patient's condition and reason for testing"
                    : "Provide context for the lab to understand what you're looking for"}
                </p>
              </div>
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder={
                isIndependentLab
                  ? "Example: Walk-in patient complaining of persistent fatigue and dizziness for the past 2 weeks. No known chronic conditions. Suspect anemia or electrolyte imbalance."
                  : "Example: Patient presents with fatigue and dizziness. Rule out anemia and electrolyte imbalance. Clinical context: 45-year-old female, no significant medical history."
              }
            />
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.push("/provider/labs")}
            className="inline-flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating order…
              </>
            ) : (
              <>
                <FlaskConical className="h-4 w-4" />
                Create lab order
              </>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}