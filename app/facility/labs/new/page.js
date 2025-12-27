"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { createLabOrder } from "@/lib/labsActions";
import {
  FlaskConical,
  User,
  AlertCircle,
  Zap,
  FileText,
  Stethoscope,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  ArrowLeft,
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

export default function FacilityNewLabOrderPage() {
  const router = useRouter();

  // Form state
  const [patientId, setPatientId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [priority, setPriority] = useState("ROUTINE");
  const [notes, setNotes] = useState("");

  // Lab catalog state
  const [labCatalog, setLabCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [selectedTests, setSelectedTests] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Lookup data
  const [patients, setPatients] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);

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

    async function fetchProviders() {
      try {
        setLoadingProviders(true);
        const res = await apiFetch("/providers/?facility=current&page=1&limit=50");
        if (cancelled) return;
        const items = normalizeList(res);
        setProviders(items);
      } catch (err) {
        console.error("Failed to load providers", err);
        if (!cancelled) setProviders([]);
      } finally {
        if (!cancelled) setLoadingProviders(false);
      }
    }

    fetchPatients();
    fetchProviders();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load facility's lab catalog
  useEffect(() => {
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
  }, []);

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

  const selectedPatientLabel = useMemo(() => {
    if (!patientId) return "No patient selected";
    const p = patients.find((x) => String(x.id) === String(patientId));
    if (!p) return "Patient not found";
    const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ");
    return fullName || p.email || `Patient #${p.id}`;
  }, [patientId, patients]);

  const selectedProviderLabel = useMemo(() => {
    if (!providerId) return "Any available provider";
    const p = providers.find((x) => String(x.id) === String(providerId));
    if (!p) return "Provider not found";
    const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ");
    return fullName || p.email || `Provider #${p.id}`;
  }, [providerId, providers]);

  const totalCost = useMemo(() => {
    return selectedTests.reduce(
      (sum, test) => sum + Number(test.price || 0),
      0
    );
  }, [selectedTests]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const patient = Number(patientId);
    if (!patient || Number.isNaN(patient)) {
      setError(
        !loadingPatients && patients.length === 0
          ? "No patients available. Create a patient profile first."
          : "Please select a patient."
      );
      return;
    }

    if (selectedTests.length === 0) {
      setError("Please select at least one test from the lab catalog.");
      return;
    }

    const payload = {
      patient,
      priority: priority || "ROUTINE",
      items: selectedTests.map((t) => ({ test_code: t.code })),
      note: notes.trim(),
    };

    const provider = Number(providerId);
    if (provider && !Number.isNaN(provider)) {
      payload.provider = provider;
    }

    setIsSubmitting(true);
    try {
      await createLabOrder(payload);
      router.push("/facility/labs");
    } catch (err) {
      console.error("Create lab order failed", err);
      setError(err?.message || "Failed to create lab order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl p-6 md:p-10">
      {/* Header */}
      <header className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
          <FlaskConical className="h-3.5 w-3.5" />
          Facility · New Lab Order
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Create lab order
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Order lab tests for a patient. Select tests from your facility's
              catalog and assign to a provider.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/facility/labs")}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
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

          {/* Provider Selection */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600" />
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50">
                  <Stethoscope className="h-5 w-5 text-purple-700" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Requesting Provider
                  </h2>
                  <p className="text-xs text-slate-500">
                    Assign a provider (optional)
                  </p>
                </div>
              </div>

              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">
                  {loadingProviders
                    ? "Loading providers…"
                    : "— Any available provider —"}
                </option>
                {!loadingProviders &&
                  providers.map((p) => {
                    const fullName = [p.first_name, p.last_name]
                      .filter(Boolean)
                      .join(" ");
                    const label = fullName || p.email || `Provider #${p.id}`;
                    return (
                      <option key={p.id} value={String(p.id)}>
                        {label}
                        {p.provider_type
                          ? ` – ${p.provider_type}`
                          : p.role
                          ? ` – ${p.role}`
                          : ""}
                      </option>
                    );
                  })}
              </select>
            </div>
          </section>

          {/* Lab Catalog Selection */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600" />
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50">
                  <FlaskConical className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Tests to Order
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select tests from your facility's catalog
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
                          {test.price > 0 && (
                            <span className="text-xs text-emerald-600">
                              ₦{Number(test.price).toLocaleString()}
                            </span>
                          )}
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
                <div className="max-h-80 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {filteredCatalog.slice(0, 15).map((test) => {
                    const isSelected = selectedTests.some(
                      (t) => t.id === test.id
                    );
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
                          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-slate-500">
                            {test.unit && <span>Unit: {test.unit}</span>}
                            {(test.ref_low || test.ref_high) && (
                              <span>
                                Range: {test.ref_low ?? "—"} –{" "}
                                {test.ref_high ?? "—"}
                              </span>
                            )}
                          </div>
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
                  {filteredCatalog.length > 15 && (
                    <div className="px-3 py-2 text-center text-xs text-slate-500">
                      +{filteredCatalog.length - 15} more tests. Refine your
                      search.
                    </div>
                  )}
                </div>
              ) : catalogSearch ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                  No tests match "{catalogSearch}"
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                  Lab catalog is empty. Add tests in settings.
                </div>
              )}
            </div>
          </section>

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
                    Provide context for the lab team (optional)
                  </p>
                </div>
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Example: Patient presents with fatigue. Check for anemia and thyroid function."
              />
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => router.push("/facility/labs")}
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

        {/* Order Summary Sidebar */}
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sticky top-6">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500" />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50">
                  <FlaskConical className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Order Summary
                  </h2>
                  <p className="text-xs text-slate-500">Review before submit</p>
                </div>
              </div>

              <div className="space-y-2">
                <SummaryRow label="Patient" value={selectedPatientLabel} />
                <SummaryRow label="Provider" value={selectedProviderLabel} />
                <SummaryRow
                  label="Tests"
                  value={
                    selectedTests.length
                      ? `${selectedTests.length} test${
                          selectedTests.length > 1 ? "s" : ""
                        }`
                      : "None selected"
                  }
                />
                <SummaryRow
                  label="Priority"
                  value={
                    PRIORITY_OPTIONS.find((p) => p.value === priority)?.label ||
                    priority
                  }
                />
                {totalCost > 0 && (
                  <SummaryRow
                    label="Total Cost"
                    value={`₦${totalCost.toLocaleString()}`}
                    highlight
                  />
                )}
              </div>

              {selectedTests.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Test Details
                  </div>
                  <div className="space-y-1">
                    {selectedTests.map((test) => (
                      <div
                        key={test.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-slate-700">{test.name}</span>
                        {test.price > 0 && (
                          <span className="font-medium text-slate-900">
                            ₦{Number(test.price).toLocaleString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600">
            <p className="mb-2 font-semibold text-slate-800">
              💡 Quick Tips
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>
                Select multiple tests at once for comprehensive workups
              </li>
              <li>Search by test code or name to find tests quickly</li>
              <li>Use STAT priority only when critically urgent</li>
              <li>Add clinical notes to help the lab prioritize</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

/* ─────────────── UI helpers ─────────────── */

function SummaryRow({ label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <span
        className={`text-xs font-semibold ${
          highlight ? "text-emerald-700" : "text-slate-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}