"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Pill,
  ArrowLeft,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  User,
  FileText,
  Building2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

function safeToUpper(v) {
  return String(v || "").toUpperCase();
}

function normaliseList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const numericKeys = Object.keys(payload).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => payload[k]);
    }
  }
  return [];
}

export default function PrescriptionCreateForm({
  title,
  subtitle,
  backHref,
  redirectTo,
}) {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);

  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);

  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [patientId, setPatientId] = useState("");
  const [encounterId, setEncounterId] = useState("");
  const [note, setNote] = useState("");

  // Outsourcing (independent doctors/nurses)
  const [outsourcedTo, setOutsourcedTo] = useState("");
  const [externalPharmacies, setExternalPharmacies] = useState([]);
  const [pharmaciesLoading, setPharmaciesLoading] = useState(false);
  const [pharmaciesError, setPharmaciesError] = useState("");
  const [selectedPharmacyName, setSelectedPharmacyName] = useState("");
  const [selectedPharmacyAddress, setSelectedPharmacyAddress] = useState("");

  // Selected medications with their details
  const [selectedMeds, setSelectedMeds] = useState([]);
  
  // Search for catalog
  const [catalogSearch, setCatalogSearch] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const meRole = safeToUpper(me?.role);
  const providerType = safeToUpper(me?.provider?.provider_type);
  const isDoctorOrNurse =
    ["DOCTOR", "NURSE"].includes(meRole) ||
    ["DOCTOR", "NURSE"].includes(providerType);
  const isPharmacyProvider = meRole === "PHARMACY" || providerType === "PHARMACIST";
  const isIndependent = !me?.facility;
  const shouldSelectExternalPharmacy = isIndependent && isDoctorOrNurse && !isPharmacyProvider;

  useEffect(() => {
    let cancelled = false;
    async function loadPatients() {
      try {
        setPatientsLoading(true);
        const res = await apiFetch("/patients/?page=1&limit=200", {
          method: "GET",
        });
        if (cancelled) return;
        setPatients(normaliseList(res));
      } catch (e) {
        if (!cancelled) setPatients([]);
      } finally {
        if (!cancelled) setPatientsLoading(false);
      }
    }
    loadPatients();
    return () => {
      cancelled = true;
    };
  }, []);
  // Load external pharmacies for independent doctors/nurses
  useEffect(() => {
    if (meLoading || !shouldSelectExternalPharmacy) return;

    let cancelled = false;
    async function loadExternalPharmacies() {
      try {
        setPharmaciesLoading(true);
        setPharmaciesError("");
        const res = await apiFetch("/providers/?facility=none&type=PHARMACIST", {
          method: "GET",
        });
        if (cancelled) return;
        setExternalPharmacies(normaliseList(res));
      } catch (e) {
        if (!cancelled) {
          setExternalPharmacies([]);
          setPharmaciesError(e?.message || "Failed to load external pharmacies.");
        }
      } finally {
        if (!cancelled) setPharmaciesLoading(false);
      }
    }

    loadExternalPharmacies();
    return () => {
      cancelled = true;
    };
  }, [meLoading, shouldSelectExternalPharmacy]);

  // Load catalog (own catalog for pharmacies, or external pharmacy catalog for independent doctors/nurses)
  useEffect(() => {
    if (meLoading) return;

    let cancelled = false;
    async function loadCatalog() {
      try {
        setCatalogLoading(true);

        // Independent doctors/nurses must select an external pharmacy first
        if (shouldSelectExternalPharmacy && !outsourcedTo) {
          if (!cancelled) setCatalog([]);
          return;
        }

        const params = new URLSearchParams({ page: "1", limit: "500" });
        if (shouldSelectExternalPharmacy) {
          params.set("created_by", String(outsourcedTo));
        }

        const res = await apiFetch(`/pharmacy/catalog/?${params.toString()}`, {
          method: "GET",
        });
        if (cancelled) return;
        setCatalog(normaliseList(res).filter((d) => d.is_active));
      } catch {
        if (!cancelled) setCatalog([]);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }

    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [meLoading, shouldSelectExternalPharmacy, outsourcedTo]);


  const getProviderDisplayName = (provider) => {
    // Priority: business_name > display_name/full_name > email
    if (provider?.business_name) return provider.business_name;
    const fullName =
      provider?.display_name || provider?.full_name || provider?.user_name || null;
    if (fullName) return fullName;
    return provider?.user_email || provider?.email || "External pharmacy";
  };


  const formatProviderAddress = (provider) => {
    const parts = [
      (provider?.address || "").trim(),
      (provider?.lga || "").trim(),
      (provider?.state || "").trim(),
      (provider?.country || "").trim(),
    ].filter(Boolean);
    return parts.join(", ");
  };

  const patientOptions = useMemo(() => {
    return patients.map((p) => {
      const name =
        p.full_name ||
        [p.first_name, p.last_name].filter(Boolean).join(" ") ||
        `Patient #${p.id}`;
      return { id: p.id, label: `${name}${p.phone ? ` • ${p.phone}` : ""}` };
    });
  }, [patients]);

  const selectedPatientLabel = useMemo(() => {
    if (!patientId) return "No patient selected";
    const p = patients.find((x) => String(x.id) === String(patientId));
    if (!p) return "Patient not found";
    const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ");
    return fullName || p.email || `Patient #${p.id}`;
  }, [patientId, patients]);

  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return catalog;
    const q = catalogSearch.toLowerCase();
    return catalog.filter((d) => {
      return (
        d.name?.toLowerCase().includes(q) ||
        d.code?.toLowerCase().includes(q) ||
        d.strength?.toLowerCase().includes(q) ||
        d.form?.toLowerCase().includes(q)
      );
    });
  }, [catalog, catalogSearch]);

  const handleAddDrug = (drug) => {
    if (selectedMeds.some((m) => m.id === drug.id && m.use_catalog)) return;
    
    setSelectedMeds([
      ...selectedMeds,
      {
        id: drug.id,
        use_catalog: true,
        drug_code: drug.code,
        drug_name: "",
        display_name: `${drug.name || drug.code}${drug.strength ? ` ${drug.strength}` : ""}${drug.form ? ` • ${drug.form}` : ""}`,
        dose: "",
        frequency: "",
        duration_days: "",
        qty_prescribed: "",
        instruction: "",
        drug_data: drug,
      },
    ]);
    setCatalogSearch("");
  };

  const handleAddFreeText = () => {
    setSelectedMeds([
      ...selectedMeds,
      {
        id: `free-${Date.now()}`,
        use_catalog: false,
        drug_code: "",
        drug_name: "",
        display_name: "Free-text medication",
        dose: "",
        frequency: "",
        duration_days: "",
        qty_prescribed: "",
        instruction: "",
      },
    ]);
  };

  const handleRemoveMed = (id) => {
    setSelectedMeds(selectedMeds.filter((m) => m.id !== id));
  };

  const handleUpdateMed = (id, updates) => {
    setSelectedMeds(
      selectedMeds.map((m) =>
        m.id === id
          ? {
              ...m,
              ...updates,
              display_name: m.use_catalog
                ? m.display_name
                : updates.drug_name || "Free-text medication",
            }
          : m
      )
    );
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (shouldSelectExternalPharmacy) {
      const oid = Number(outsourcedTo);
      if (!Number.isFinite(oid) || oid <= 0) {
        setError("Please select an external pharmacy.");
        return;
      }
    }

    const pid = Number(patientId);
    if (!Number.isFinite(pid) || pid <= 0) {
      setError("Please select a patient.");
      return;
    }

    if (selectedMeds.length === 0) {
      setError("Please add at least one medication.");
      return;
    }

    // Validate all medications have required fields
    const invalidMeds = selectedMeds.filter((m) => {
      if (m.use_catalog && !m.drug_code) return true;
      if (!m.use_catalog && !m.drug_name?.trim()) return true;
      if (!m.dose?.trim()) return true;
      if (!m.frequency?.trim()) return true;
      return false;
    });

    if (invalidMeds.length > 0) {
      setError(
        "Please fill in medication name, dose, and frequency for all items."
      );
      return;
    }

    const items = selectedMeds.map((m) => ({
      drug_code: m.use_catalog ? m.drug_code : "",
      drug_name: m.use_catalog ? "" : m.drug_name.trim(),
      dose: m.dose.trim(),
      frequency: m.frequency.trim(),
      duration_days: m.duration_days ? Number(m.duration_days) : null,
      qty_prescribed: m.qty_prescribed ? Number(m.qty_prescribed) : null,
      instruction: m.instruction?.trim() || "",
    }));

    const eid = encounterId ? Number(encounterId) : null;

    const payload = {
      patient: pid,
      encounter_id: Number.isFinite(eid) && eid > 0 ? eid : null,
      note: note || "",
      items,
    };

    if (shouldSelectExternalPharmacy) {
      const oid = Number(outsourcedTo);
      if (Number.isFinite(oid) && oid > 0) {
        payload.outsourced_to = oid;
      }
    }

    try {
      setSaving(true);
      const created = await apiFetch("/pharmacy/prescriptions/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSuccess(`Prescription #${created?.id || ""} created successfully.`);
      setTimeout(() => {
        router.push(redirectTo);
      }, 800);
    } catch (e) {
      setError(e?.message || "Failed to create prescription.");
    } finally {
      setSaving(false);
    }
  }

  const computedTitle = shouldSelectExternalPharmacy ? "Outsource prescription" : title;
  const computedSubtitle = shouldSelectExternalPharmacy
    ? "Select an external pharmacy and prescribe from their catalog."
    : subtitle;

  return (
    <main className="mx-auto max-w-6xl p-6 md:p-10">
      {/* Header */}
      <header className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-sky-700">
          <Pill className="h-3.5 w-3.5" />
          {computedTitle}
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              {computedTitle}
            </h1>
            <p className="mt-2 text-sm text-slate-600">{computedSubtitle}</p>
          </div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          {/* Error/Success Alert */}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-100">
                <AlertCircle className="h-4 w-4 text-rose-700" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-rose-900">
                  Unable to create prescription
                </div>
                <div className="mt-1 text-sm text-rose-700">{error}</div>
              </div>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-emerald-900">
                  Success!
                </div>
                <div className="mt-1 text-sm text-emerald-700">{success}</div>
              </div>
            </div>
          )}

          {!meLoading &&
            meRole !== "PHARMACY" &&
            meRole !== "DOCTOR" &&
            meRole !== "NURSE" &&
            meRole !== "ADMIN" &&
            meRole !== "SUPER_ADMIN" && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-amber-900">
                    This page is intended for prescribing staff (doctors,
                    nurses, pharmacy).
                  </div>
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
                    Select the patient for this prescription
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Patient
                  </label>
                  <select
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">
                      {patientsLoading
                        ? "Loading patients…"
                        : patients.length
                        ? "— Select a patient —"
                        : "No patients found"}
                    </option>
                    {!patientsLoading &&
                      patientOptions.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.label}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Encounter ID (optional)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={encounterId}
                    onChange={(e) => setEncounterId(e.target.value)}
                    placeholder="e.g. 123"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          </section>

          {shouldSelectExternalPharmacy && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-1.5 w-full bg-gradient-to-r from-amber-600 via-orange-600 to-red-600" />
              <div className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50">
                    <Building2 className="h-5 w-5 text-amber-700" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      External Pharmacy
                    </h2>
                    <p className="text-xs text-slate-500">
                      Select a pharmacy to load their catalog and assign this prescription
                    </p>
                  </div>
                </div>

                <select
                  value={outsourcedTo}
                  onChange={(e) => {
                    const v = e.target.value;
                    setOutsourcedTo(v);
                    setSelectedMeds([]);
                    setCatalogSearch("");

                    const selected = externalPharmacies.find(
                      (p) => String(p?.user ?? p?.user_id ?? "") === String(v)
                    );
                    setSelectedPharmacyName(selected ? getProviderDisplayName(selected) : "");
                    setSelectedPharmacyAddress(selected ? formatProviderAddress(selected) : "");
                  }}
                  disabled={pharmaciesLoading}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                >
                  <option value="">
                    {pharmaciesLoading
                      ? "Loading pharmacies…"
                      : "— Select external pharmacy —"}
                  </option>
                  {externalPharmacies.map((p) => {
                    const value = String(p?.user ?? p?.user_id ?? "");
                    const displayName = getProviderDisplayName(p);
                    return (
                      <option key={value || displayName} value={value}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>

                {outsourcedTo && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Pharmacy address
                    </div>
                    <div className="mt-1 text-sm text-slate-700">
                      {selectedPharmacyAddress || "No address provided"}
                    </div>
                  </div>
                )}

                {pharmaciesError && (
                  <p className="mt-2 text-xs text-rose-600">{pharmaciesError}</p>
                )}
              </div>
            </section>
          )}

          {/* Medications Selection */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600" />
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50">
                  <Pill className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {shouldSelectExternalPharmacy
                      ? `Medications from ${selectedPharmacyName || "External Pharmacy"}`
                      : "Medications to Prescribe"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {shouldSelectExternalPharmacy
                      ? "Select medications from the external pharmacy catalog or add free-text items."
                      : "Select from catalog or add free-text medications"}
                  </p>
                </div>
              </div>

              {/* Selected Medications */}
              {selectedMeds.length > 0 && (
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Selected Medications ({selectedMeds.length})
                    </div>
                  </div>
                  <div className="space-y-2">
                    {selectedMeds.map((med) => (
                      <div
                        key={med.id}
                        className="group rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {med.use_catalog
                                  ? med.display_name
                                  : med.drug_name || "Free-text medication"}
                              </span>
                              {med.use_catalog && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  CATALOG
                                </span>
                              )}
                              {!med.use_catalog && (
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                  FREE-TEXT
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMed(med.id)}
                            className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-slate-600 transition hover:bg-rose-100 hover:text-rose-700"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-6">
                          {!med.use_catalog && (
                            <div className="sm:col-span-6">
                              <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                                Medication Name
                              </label>
                              <input
                                type="text"
                                value={med.drug_name}
                                onChange={(e) =>
                                  handleUpdateMed(med.id, {
                                    drug_name: e.target.value,
                                  })
                                }
                                placeholder="e.g. Paracetamol 500mg"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          )}

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                              Dose
                            </label>
                            <input
                              type="text"
                              value={med.dose}
                              onChange={(e) =>
                                handleUpdateMed(med.id, { dose: e.target.value })
                              }
                              placeholder="e.g. 1 tab"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                              Frequency
                            </label>
                            <input
                              type="text"
                              value={med.frequency}
                              onChange={(e) =>
                                handleUpdateMed(med.id, {
                                  frequency: e.target.value,
                                })
                              }
                              placeholder="e.g. BD, TDS"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                              Duration (days)
                            </label>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={med.duration_days}
                              onChange={(e) =>
                                handleUpdateMed(med.id, {
                                  duration_days: e.target.value,
                                })
                              }
                              placeholder="e.g. 5"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={med.qty_prescribed}
                              onChange={(e) =>
                                handleUpdateMed(med.id, {
                                  qty_prescribed: e.target.value,
                                })
                              }
                              placeholder="e.g. 10"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                              Instructions
                            </label>
                            <input
                              type="text"
                              value={med.instruction}
                              onChange={(e) =>
                                handleUpdateMed(med.id, {
                                  instruction: e.target.value,
                                })
                              }
                              placeholder="e.g. After meals"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
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
                  disabled={shouldSelectExternalPharmacy && !outsourcedTo}
                  placeholder={
                    shouldSelectExternalPharmacy && !outsourcedTo
                      ? "Select an external pharmacy to load catalog…"
                      : "Search catalog by name or code…"
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                />
              </div>

              {/* Available Drugs */}
              {shouldSelectExternalPharmacy && !outsourcedTo ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                  Select an external pharmacy above to load its catalog.
                </div>
              ) : catalogLoading ? (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading catalog…
                </div>
              ) : filteredCatalog.length > 0 ? (
                <div className="max-h-80 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {filteredCatalog.slice(0, 15).map((drug) => {
                    const isSelected = selectedMeds.some(
                      (m) => m.id === drug.id && m.use_catalog
                    );
                    const displayName = `${drug.name || drug.code}${drug.strength ? ` ${drug.strength}` : ""}${drug.form ? ` • ${drug.form}` : ""}`;

                    return (
                      <button
                        key={drug.id}
                        type="button"
                        onClick={() => handleAddDrug(drug)}
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
                              {drug.code}
                            </span>
                            <span className="text-xs text-slate-600">
                              {displayName}
                            </span>
                          </div>
                          {drug.unit_price > 0 && (
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              Price: ₦{Number(drug.unit_price).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
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
                      +{filteredCatalog.length - 15} more drugs. Refine your
                      search.
                    </div>
                  )}
                </div>
              ) : catalogSearch ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                  No drugs match "{catalogSearch}"
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                  Drug catalog is empty. Add drugs in settings.
                </div>
              )}

              {/* Add Free Text Button */}
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={handleAddFreeText}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  Add free-text medication
                </button>
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
                    Additional instructions for the patient or pharmacist
                    (optional)
                  </p>
                </div>
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Example: Take with plenty of water. Avoid alcohol during treatment."
              />
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating prescription…
                </>
              ) : (
                <>
                  <Pill className="h-4 w-4" />
                  Create prescription
                </>
              )}
            </button>
          </div>
        </form>

        {/* Order Summary Sidebar */}
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sticky top-6">
            <div className="h-1.5 w-full bg-gradient-to-r from-sky-600 via-blue-500 to-indigo-500" />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-sky-50">
                  <Pill className="h-5 w-5 text-sky-700" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Prescription Summary
                  </h2>
                  <p className="text-xs text-slate-500">Review before submit</p>
                </div>
              </div>

              <div className="space-y-2">
                <SummaryRow label="Patient" value={selectedPatientLabel} />
                <SummaryRow
                  label="Medications"
                  value={
                    selectedMeds.length
                      ? `${selectedMeds.length} medication${
                          selectedMeds.length > 1 ? "s" : ""
                        }`
                      : "None selected"
                  }
                />
                {encounterId && (
                  <SummaryRow label="Encounter" value={`#${encounterId}`} />
                )}
              </div>

              {selectedMeds.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Medication Details
                  </div>
                  <div className="space-y-1.5">
                    {selectedMeds.map((med) => (
                      <div
                        key={med.id}
                        className="rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-xs font-medium text-slate-900">
                              {med.use_catalog
                                ? med.display_name
                                : med.drug_name || "Free-text"}
                            </div>
                            {med.dose && (
                              <div className="mt-0.5 text-[11px] text-slate-600">
                                {med.dose}
                                {med.frequency && ` • ${med.frequency}`}
                                {med.duration_days &&
                                  ` • ${med.duration_days} days`}
                              </div>
                            )}
                          </div>
                          {!med.use_catalog && (
                            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">
                              FREE
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600">
            <p className="mb-2 font-semibold text-slate-800">💡 Quick Tips</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Search catalog by drug name or code for quick selection</li>
              <li>Use free-text for medications not in your catalog</li>
              <li>Fill in dose, frequency, and duration for each medication</li>
              <li>Add clinical notes for special instructions</li>
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
          highlight ? "text-sky-700" : "text-slate-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}